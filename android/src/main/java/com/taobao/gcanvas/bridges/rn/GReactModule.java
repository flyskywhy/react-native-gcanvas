package com.taobao.gcanvas.bridges.rn;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Point;
import android.opengl.GLES20;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.view.View;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.taobao.gcanvas.GCanvasJNI;
import com.taobao.gcanvas.adapters.img.impl.fresco.GCanvasFrescoImageLoader;
import com.taobao.gcanvas.bridges.rn.bridge.RNJSCallbackArray;
import com.taobao.gcanvas.bridges.rn.bridge.RNJSCallbackDataFactory;
import com.taobao.gcanvas.bridges.rn.bridge.RNJSCallbackMap;
import com.taobao.gcanvas.bridges.spec.bridge.IJSCallbackDataFactory;
import com.taobao.gcanvas.bridges.spec.module.AbsGBridgeModule;
import com.taobao.gcanvas.bridges.spec.module.IGBridgeModule;
import com.taobao.gcanvas.util.GLog;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static com.taobao.gcanvas.bridges.spec.module.IGBridgeModule.ContextType._2D;
import com.taobao.gcanvas.bridges.spec.module.GImageLoadInfo;

/**
 * ReactNative bridge.
 *
 * @author ertong
 */
public class GReactModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    private static final String NAME = "GCanvasModule";

    private static final String TAG = GReactModule.class.getSimpleName();

    private HashMap<String, GReactTextureView> mViews = new HashMap<>();

    private interface IReactCacheCmd {
        void execute();
    }

    private class SetContextTypeCmd implements IReactCacheCmd {
        private String canvasId;
        private int type;

        public SetContextTypeCmd(String canvasId, int type) {
            this.canvasId = canvasId;
            this.type = type;
        }

        @Override
        public void execute() {
            setContextTypeOnce(type, canvasId);
        }
    }

    private class RenderCmd implements IReactCacheCmd {
        private String canvasId, cmd;
        private int type;

        public RenderCmd(String canvasId, String cmd, int type) {
            this.canvasId = canvasId;
            this.cmd = cmd;
            this.type = type;
        }

        @Override
        public void execute() {
            render(canvasId, cmd, type);
        }
    }

    private class BindImageTextureCmd implements IReactCacheCmd {
        private ReadableArray array;
        private String refId;
        private Callback callback;

        public BindImageTextureCmd(ReadableArray array, String refId, Callback callback) {
            this.array = array;
            this.refId = refId;
            this.callback = callback;
        }

        @Override
        public void execute() {
            bindImageTexture(array, refId, callback);
        }
    }

    private HashMap<String, ArrayList<IReactCacheCmd>> mCacheCmdList = new HashMap<>();


    private enum HostLifeState {
        Idle, Running, Paused, Destroyed
    }

    private AtomicReference<HostLifeState> mLifeRef = new AtomicReference<>(HostLifeState.Idle);

    @Override
    public void onHostResume() {
        mLifeRef.set(HostLifeState.Running);
    }

    @Override
    public void onHostPause() {
        mLifeRef.set(HostLifeState.Paused);
    }

    @Override
    public void onHostDestroy() {
        // release resource
        mLifeRef.set(HostLifeState.Destroyed);
        getReactApplicationContext().removeLifecycleEventListener(this);
        Iterator<Map.Entry<String, GReactTextureView>> iter = mViews.entrySet().iterator();
        while (iter.hasNext()) {
            Map.Entry<String, GReactTextureView> entry = iter.next();
            GReactTextureView val = entry.getValue();
            val.onHostDestroy();
        }

        mViews.clear();
        mCacheCmdList.clear();
    }

    private void addCacheCommand(String refId, IReactCacheCmd cmd) {
        ArrayList<IReactCacheCmd> cacheCmds = mCacheCmdList.get(refId);
        if (null == cacheCmds) {
            cacheCmds = new ArrayList<>();
            mCacheCmdList.put(refId, cacheCmds);
        }
        cacheCmds.add(cmd);
    }

    private class RNModuleImpl extends AbsGBridgeModule<Callback> {

        private final RNJSCallbackDataFactory mFactory = new RNJSCallbackDataFactory();

        @Override
        public String enable(JSONObject data) {
            try {
                final String refId = data.getString("componentId");
                final int viewTag = Integer.parseInt(refId);

                if (null == getCurrentActivity()) {
                    return Boolean.FALSE.toString();
                }

                final Handler mainHandler = new Handler(Looper.getMainLooper());

                final Runnable runnable = new Runnable() {
                    @Override
                    public void run() {
                        Activity activity = getCurrentActivity();
                        if (null == activity || mLifeRef.get().ordinal() > HostLifeState.Paused.ordinal()) {
                            return;
                        }

                        GReactTextureView view = null;
                        if (mViews.containsKey(refId) && mCacheCmdList.containsKey(refId)) {
                            view = mViews.get(refId);
                        } else {
                            View v = activity.findViewById(viewTag);

                            try {
                                view = (GReactTextureView) v;
                            } catch (Exception e) {
                                // Sometimes(when RELOAD js of react-native) cause
                                // `java.lang.ClassCastException: com.facebook.react.views.view.ReactViewGroup cannot be cast to com.taobao.gcanvas.bridges.rn.GReactTextureView`
                                // and crash the APP, then found catch Exception
                                // and just return here is OK.

                                // System.out.println(e);
                                GLog.e(TAG, Log.getStackTraceString(e));
                                return;
                            }

                            if (null != view && view.isReady()) {
                                mViews.put(refId, view);
                            } else {
                                view = null;
                            }
                        }


                        if (null != view && mCacheCmdList.containsKey(refId) && view.isReady()) {
                            ArrayList<IReactCacheCmd> cmdList = mCacheCmdList.remove(refId);
                            for (IReactCacheCmd cmd : cmdList) {
                                GLog.d(TAG, "execute command ===> " + cmd.getClass().getSimpleName());
                                cmd.execute();
                            }
                            return;
                        }

                        mainHandler.removeCallbacks(this);
                        mainHandler.postDelayed(this, 16);
                    }
                };

                mainHandler.post(runnable);
                return Boolean.TRUE.toString();
            } catch (Throwable e) {
                e.printStackTrace();
                return Boolean.FALSE.toString();
            }
        }

        @Override
        public void disable(String canvasId) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "disable() can not find canvas with id ===> " + canvasId);
                return;
            }
            textureView.manuallyDestroy();
        }

        @Override
        public void setContextType(String canvasId, ContextType type) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "setContextType() can not find canvas with id ===> " + canvasId);
                return;
            }
            GCanvasJNI.setContextType(textureView.getCanvasKey(), type.value());
        }

        @Override
        public void setDevicePixelRatio(String canvasId, double ratio) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "setDevicePixelRatio() can not find canvas with id ===> " + canvasId);
                return;
            }
            GCanvasJNI.setDevicePixelRatio(textureView.getCanvasKey(), ratio);
        }

        @Override
        public void resetGlViewport(String canvasId) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "resetGlViewport() can not find canvas with id ===> " + canvasId);
                return;
            }
            textureView.mCallback.resetGlViewport();
        }

        @Override
        public void render(String canvasId, String cmd, int type) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "render() can not find canvas with id ===> " + canvasId);
                return;
            }
            GCanvasJNI.render(textureView.getCanvasKey(), cmd, type);
        }

        @Override
        public String extendCallNative(String canvasId, String cmd, int type) {
            GReactTextureView textureView = mViews.get(canvasId);
            if (null == textureView) {
                GLog.w(TAG, "extendCallNative() can not find canvas with id ===> " + canvasId);
                return "";
            }
            return GCanvasJNI.render(textureView.getCanvasKey(), cmd, type);
        }

        @Override
        public Context getContext() {
            return getReactApplicationContext();
        }

        @Override
        protected void invokeCallback(Callback callback, Object args) {
            if (null != callback) {
                if (args instanceof RNJSCallbackArray) {
                    callback.invoke(((RNJSCallbackArray) args).getArray());
                } else if (args instanceof RNJSCallbackMap) {
                    callback.invoke(((RNJSCallbackMap) args).getMap());
                } else {
                    callback.invoke(args);
                }
            }
        }

        @Override
        protected IJSCallbackDataFactory getDataFactory() {
            return mFactory;
        }
    }

    private RNModuleImpl mImpl;

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void drawCanvas2Canvas(final ReadableMap map) {
        if (null == map) {
            return;
        }
        String srcComponentId = map.getString("srcComponentId");
        String componentId = map.getString("dstComponentId");
        int tw = map.getInt("tw");
        int th = map.getInt("th");
        int sx = map.getInt("sx");
        int sy = map.getInt("sy");
        int sw = map.getInt("sw");
        int sh = map.getInt("sh");
        int dx = map.getInt("dx");
        int dy = map.getInt("dy");
        int dw = map.getInt("dw");
        int dh = map.getInt("dh");

        GReactTextureView textureView = mViews.get(componentId);
        if (null == textureView) {
            GLog.w(TAG, "can not find canvas with id ===> " + componentId);
            return;
        }
        GReactTextureView srcTextureView = mViews.get(srcComponentId);
        if (null == srcTextureView) {
            GLog.w(TAG, "can not find source canvas with id ===> " + srcComponentId);
            return;
        }

        GLog.d(TAG, "drawCanvas2Canvas srcComponentId:" + srcComponentId + " componentId:" + componentId);

        mImpl.drawCanvas2Canvas(textureView.getCanvasKey(), tw, th, srcTextureView.getCanvasKey(), sx, sy, sw, sh, dx, dy, dw, dh);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void bindImageTexture(final ReadableArray array, final String refId, final Callback callback) {
        if (null == array || TextUtils.isEmpty(refId) || array.size() != 2) {
            return;
        }
        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "can not find canvas with id ===> " + refId);
            addCacheCommand(refId, new BindImageTextureCmd(array, refId, callback));
            return;
        }
        String url = array.getString(0);
        int rid = array.getInt(1);
        mImpl.bindImageTexture(textureView.getCanvasKey(), url, rid, callback);
    }

    @ReactMethod
    public void preLoadImage(ReadableArray args, final Callback callback) {
        if (null == args || args.size() != 2) {
            GLog.d(TAG, "invalid input parameter");
            return;
        }
        try {
            JSONArray array = new JSONArray();
            array.put(args.getString(0));
            array.put(args.getInt(1));
            mImpl.preLoadImage(array, callback);
        } catch (Throwable e) {
            GLog.e(TAG, e.getMessage(), e);
            HashMap<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            mImpl.invokeCallback(callback, error);
        }
    }


    @ReactMethod
    public void render(String canvasId, String cmd, int type) {
        if (TextUtils.isEmpty(canvasId) || TextUtils.isEmpty(cmd)) {
            return;
        }

        GReactTextureView textureView = mViews.get(canvasId);
        if (null == textureView) {
            GLog.w(TAG, "render ==> can not find canvas with id ===> " + canvasId);
            addCacheCommand(canvasId, new RenderCmd(canvasId, cmd, type));
            return;
        }

        mImpl.render(canvasId, cmd, type);
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public WritableMap extendCallNative(ReadableMap args) {
        String canvasId = args.getString("contextId");
        int type = args.getInt("type");
        String cmd = args.getString("args");

        WritableMap retMap = Arguments.createMap();
        retMap.putString("result", mImpl.extendCallNative(canvasId, cmd, type));
        return retMap;
    }


    @ReactMethod
    public void setLogLevel(int level) {
        GLog.e(TAG, "setLogLevel() args: " + level);
        mImpl.setLogLevel(level);
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public String enable(ReadableMap args) {
        if (null == args) {
            return Boolean.FALSE.toString();
        }

        if (!args.hasKey("componentId")) {
            return Boolean.FALSE.toString();
        }

        if (mViews.containsKey(args.getString("componentId"))) {
            return Boolean.TRUE.toString();
        }

        JSONObject data = new JSONObject();
        try {
            data.putOpt("componentId", args.getString("componentId"));
            GLog.d(TAG, "RNModuleImpl enable");
            return mImpl.enable(data);
        } catch (JSONException e) {
            GLog.e(TAG, "error when enable", e);
            return Boolean.FALSE.toString();
        }
    }

    @ReactMethod
    public void disable(String refId) {
        if (TextUtils.isEmpty(refId)) {
            return;
        }

        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "disable ==> can not find canvas with id ===> " + refId);
            return;
        }

        GLog.d(TAG, "RNModuleImpl disable");
        mImpl.disable(refId);
    }

    @ReactMethod
    public void getDeviceInfo(String args, Callback callBack) {
        if (!TextUtils.isEmpty(args)) {

            HashMap<String, Object> hm = new HashMap<>();

            JSONObject data = new JSONObject();
            try {
                data.put("platform", "Android");
            } catch (JSONException e) {
            }
            hm.put("data", data.toString());
            callBack.invoke(hm);
        }
    }

    public GReactTextureView waitTextureViewReady(String refId, int timeoutMs) {
        int i = timeoutMs / 16; // TODO: maybe smaller than 16 is better

        GReactTextureView textureView = null;
        while (i-- > 0) {
            textureView = mViews.get(refId);
            if (null != textureView) {
                break;
            }
            try {
              Thread.sleep(16);
            } catch (Exception ex) {
              ex.printStackTrace();
            }
        }

        return textureView;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void setContextType(int args, String refId) {
        if (TextUtils.isEmpty(refId)) {
            return;
        }

        waitTextureViewReady(refId, 1000); // 500ms is enough, use 1000ms to insure
        setContextTypeOnce(args, refId);
    }

    public void setContextTypeOnce(int args, String refId) {
        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "setContextType can not find canvas with id ===> " + refId);
            addCacheCommand(refId, new SetContextTypeCmd(refId, args));
            return;
        }

        Activity ctx = getCurrentActivity();
        if (ctx == null) {
            GLog.w(TAG, "setDevicePixelRatio error ctx == null");
            return;
        }

        Display display = ctx.getWindowManager().getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);
        // double devicePixelRatio = size.x * 1.0 / size.y;
// 12-22 13:31:42.302: I/GReactModule(23246): enable size Point(1080, 2163)
// 12-22 13:31:42.302: I/GReactModule(23246): enable devicePixelRatio 0.49930651872399445
// devicePixelRatio is weird to use by x/y above, so use density below

        DisplayMetrics displayMetrics = new DisplayMetrics();
        display.getMetrics(displayMetrics);
        double devicePixelRatio = displayMetrics.density;

        GLog.d(TAG, "enable size " + size.toString());
        GLog.d(TAG, "enable devicePixelRatio " + devicePixelRatio);

        mImpl.setDevicePixelRatio(refId, devicePixelRatio);


        IGBridgeModule.ContextType type = _2D;
        try {
            type = IGBridgeModule.ContextType.values()[args];
        } catch (Throwable throwable) {
        }

        mImpl.setContextType(refId, type);
    }

    @ReactMethod
    public void setDevicePixelRatio(String refId, double ratio) {
        if (TextUtils.isEmpty(refId)) {
            return;
        }

        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "setDevicePixelRatio can not find canvas with id ===> " + refId);
            return;
        }

        GLog.d(TAG, "setDevicePixelRatio " + ratio);
        mImpl.setDevicePixelRatio(refId, ratio);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void resetGlViewport(String refId) {
        if (TextUtils.isEmpty(refId)) {
            return;
        }

        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "resetGlViewport can not find canvas with id ===> " + refId);
            return;
        }

        mImpl.resetGlViewport(refId);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String toDataURL(String refId, String mimeType, float quality) {
        if (TextUtils.isEmpty(refId)) {
            return "";
        }

        GReactTextureView textureView = mViews.get(refId);
        if (null == textureView) {
            GLog.w(TAG, "toDataURL can not find canvas with id ===> " + refId);
            return "";
        }

        Bitmap bmp = textureView.getBitmap();
        Bitmap.CompressFormat format = Bitmap.CompressFormat.PNG;
        String base64Str = "data:image/png;base64,";
        if (mimeType.equals("image/jpeg")) {
            format = Bitmap.CompressFormat.JPEG;
            base64Str = "data:image/jpeg;base64,";
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bmp.compress(format, (int)(quality * 100), baos);
        byte[] byteArray = baos.toByteArray();

        return base64Str + Base64.encodeToString(byteArray, Base64.NO_WRAP);
    }


    @ReactMethod
    public void setAlpha(String refId, float alpha) {
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public void texImage2D(final String refId, final int target, final int level, final int internalformat, final int format, final int type, String path) {
        GImageLoadInfo imgInfo = mImpl.fetchLoadImage(path);
        if (imgInfo == null) {
            return;
        }

        Bitmap bmp = imgInfo.image;

        int bmpWidth = bmp.getWidth();
        int bmpHeight = bmp.getHeight();
        Bitmap.Config bmpFormat = bmp.getConfig();

        int glInternalformat = internalformat;
        int glFormat = format;

        if (bmpWidth <= 0 || bmpHeight <= 0 ||
            (bmpFormat != Bitmap.Config.RGB_565 &&
             bmpFormat != Bitmap.Config.ARGB_8888) &&
             bmpFormat != Bitmap.Config.ARGB_4444) {
            GLog.w("the bitmap is not support, width=" + bmpWidth + " height=" + bmpHeight + " format=" + bmpFormat);
            return;
        } else {
            if (bmpFormat == Bitmap.Config.RGB_565) {
                GLog.d("the bitmap is rgb format.");
                glInternalformat = GLES20.GL_RGB;
                glFormat = GLES20.GL_RGB;
            } else if (bmpFormat == Bitmap.Config.ARGB_8888 ||
                       bmpFormat == Bitmap.Config.ARGB_4444) {
                GLog.d("the bitmap is rgba format.");
                glInternalformat = GLES20.GL_RGBA;
                glFormat = GLES20.GL_RGBA;
            } else {
                GLog.w("the bitmap format=" + bmpFormat + " not support.");
                return;
            }
        }

        int bytes = bmp.getAllocationByteCount();
        ByteBuffer buf = ByteBuffer.allocate(bytes);
        bmp.copyPixelsToBuffer(buf);
        byte[] byteArray = buf.array();
        for (int i = 0; i < byteArray.length; i++) {
            byteArray[i] &= 0xff;
        }

        // ref to processArray() in packages/gcanvas/src/context/webgl/RenderingContext.js
        int arrayType = 1;
        String pixelStr = Arrays.toString(byteArray).replace("[","").replace("]","").replace(" ","");
        String base64Str = Base64.encodeToString(pixelStr.getBytes(), Base64.NO_WRAP);

        int border = 0;

        String cmd = "102,9," + target + "," + level + "," + glInternalformat + "," + bmpWidth + "," + bmpHeight + "," + border + ","
                + glFormat + "," + type + "," + arrayType +  "," + base64Str;

        mImpl.extendCallNative(refId, cmd, 0x60000000); // 0x60000000 ref to packages/gcanvas/src/bridge/react-native.js
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void texSubImage2D(final String refId, final int target, final int level, final int xoffset, final int yoffset, final int format, final int type, String path) {
        GImageLoadInfo imgInfo = mImpl.fetchLoadImage(path);
        if (imgInfo == null) {
            return;
        }

        Bitmap bmp = imgInfo.image;

        int bmpWidth = bmp.getWidth();
        int bmpHeight = bmp.getHeight();
        Bitmap.Config bmpFormat = bmp.getConfig();

        if (bmpWidth <= 0 || bmpHeight <= 0 ||
            (bmpFormat != Bitmap.Config.RGB_565 &&
             bmpFormat != Bitmap.Config.ARGB_8888)) {
            GLog.w("the bitmap is not support, width=" + bmpWidth + " height=" + bmpHeight + " format=" + bmpFormat);
            return;
        }

        int bytes = bmp.getAllocationByteCount();
        ByteBuffer buf = ByteBuffer.allocate(bytes);
        bmp.copyPixelsToBuffer(buf);
        byte[] byteArray = buf.array();
        for (int i = 0; i < byteArray.length; i++) {
            byteArray[i] &= 0xff;
        }

        // ref to processArray() in packages/gcanvas/src/context/webgl/RenderingContext.js
        int arrayType = 1;
        String pixelStr = Arrays.toString(byteArray).replace("[","").replace("]","").replace(" ","");
        String base64Str = Base64.encodeToString(pixelStr.getBytes(), Base64.NO_WRAP);

        String cmd = "105,9," + target + "," + level + "," + xoffset + ',' + yoffset + "," + bmpWidth + "," + bmpHeight + ","
                + format + "," + type + "," + arrayType +  "," + base64Str;

        mImpl.extendCallNative(refId, cmd, 0x60000000); // 0x60000000 ref to packages/gcanvas/src/bridge/react-native.js
    }

    public GReactModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mImpl = new RNModuleImpl();
        mImpl.setImageLoader(new GCanvasFrescoImageLoader());
        getReactApplicationContext().addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return NAME;
    }
}

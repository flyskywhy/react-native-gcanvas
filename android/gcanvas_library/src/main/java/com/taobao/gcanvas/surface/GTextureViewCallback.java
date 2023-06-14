package com.taobao.gcanvas.surface;

import android.annotation.TargetApi;
import android.graphics.SurfaceTexture;
import android.os.Build;
import android.text.TextUtils;
import android.view.Surface;
import android.view.TextureView;

import com.taobao.gcanvas.GCanvas;
import com.taobao.gcanvas.GCanvasJNI;
import com.taobao.gcanvas.util.GLog;

import java.util.ArrayList;

import android.annotation.TargetApi;
import android.graphics.SurfaceTexture;
import android.os.Build;
import android.text.TextUtils;
import android.view.Surface;
import android.view.TextureView;

import com.taobao.gcanvas.GCanvasJNI;
import com.taobao.gcanvas.util.GLog;


import java.util.ArrayList;

/**
 * @author ertong
 * create at 2017/8/1
 */

public class GTextureViewCallback implements TextureView.SurfaceTextureListener {
    private final String mKey;
    private String mBackgroundColor = "#00000000";  // "#00000000" match [UIColor clearColor] in ios/RCTGCanvasView.m
    private boolean mEnableFboMsaa = false; // default mEnableFboMsaa is false in core/src/platform/Android/GCanvas2DContextAndroid.h
    private Surface mSurface;
    private int mWidth;
    private int mHeight;
    private TextureView mTextureview;

    private ArrayList<TextureView.SurfaceTextureListener> mDelegateLists;

    static {
        GCanvasJNI.load();
    }

    public GTextureViewCallback(TextureView v, String id) {
        this.mKey = id;
        this.mTextureview = v;
        GCanvasJNI.setWrapperContextType(id, 0);
    }


    public void addSurfaceTextureListener(TextureView.SurfaceTextureListener listener) {
        if (null == mDelegateLists) {
            mDelegateLists = new ArrayList<>(1);
        }

        if (!mDelegateLists.contains(listener)) {
            mDelegateLists.add(listener);
        }
    }

    public void removeSurfaceTextureListener(TextureView.SurfaceTextureListener listener) {
        if (null == mDelegateLists) {
            return;
        }

        mDelegateLists.remove(listener);
    }

    public void setBackgroundColor(String color) {
        if (!TextUtils.isEmpty(color)) {
            mBackgroundColor = color;
        }
    }

    public void setEnableFboMsaa(boolean isEnableFboMsaa) {
        mEnableFboMsaa = isEnableFboMsaa;
    }

    @TargetApi(Build.VERSION_CODES.JELLY_BEAN)
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        GLog.d("on surfaceTexture Available width:" + width + " height:" + height);
        if (mSurface == null) {
            mSurface = new Surface(surface);
        }
        // onSurfaceTextureAvailable is sometimes called with 0 size texture
        // and immediately followed by onSurfaceTextureSizeChanged with actual size
        if (width != 0 && height != 0) {
            mWidth = width;
            mHeight = height;
            GLog.d("resetGlViewport() in onSurfaceTextureAvailable");
            resetGlViewport();
        }
        GCanvasJNI.refreshArguments(mKey);
        if (GCanvasJNI.sendEvent(mKey)) {
            if (mTextureview instanceof GTextureView) {
                GLog.d("start to send event in GSurfaceCallback.");
                ((GTextureView) mTextureview).sendEvent();
            }
        }

        if (null != mDelegateLists) {
            for (TextureView.SurfaceTextureListener listener : mDelegateLists) {
                listener.onSurfaceTextureAvailable(surface, width, height);
            }
        }
    }

    public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
        GLog.d("on surfaceTexture changed.");

        if (mSurface == null) {
            mSurface = new Surface(surface);
        }
        if (width != 0 && height != 0) {
            mWidth = width;
            mHeight = height;
            // GLog.d("resetGlViewport() in onSurfaceTextureSizeChanged");
            // resetGlViewport();
        }

        if (null != mDelegateLists) {
            for (TextureView.SurfaceTextureListener listener : mDelegateLists) {
                listener.onSurfaceTextureSizeChanged(surface, width, height);
            }
        }
    }

    public void resetGlViewport() {
        GLog.d("resetGlViewport width:" + mWidth + " height:" + mHeight);
        onSurfaceChanged(this.mKey, mSurface, 0, mWidth, mHeight, mBackgroundColor, mEnableFboMsaa);
    }

    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
        GLog.d("on surfaceTexture destroyed.");

        if (null != mDelegateLists) {
            for (TextureView.SurfaceTextureListener listener : mDelegateLists) {
                listener.onSurfaceTextureDestroyed(surface);
            }
        }

        return false;
    }

    public void onSurfaceTextureUpdated(SurfaceTexture surface) {

    }

    public void onRequestExit() {
        GLog.d("on RequestExit");

        onSurfaceDestroyed(this.mKey, mSurface);

        if (null != mSurface && mSurface.isValid()) {
            mSurface.release();
            mSurface = null;
        }

        onRenderExit(this.mKey);

        if (null != mDelegateLists) {
            mDelegateLists.clear();
        }
    }

    public String getKey() {
        return mKey;
    }

    private native void onSurfaceCreated(String key, Surface surface);

    private native void onSurfaceChanged(String key, Surface surface, int format, int width, int height, String color, boolean isEnableFboMsaa);

    private native void onSurfaceDestroyed(String key, Surface surface);

    private native void onRenderExit(String key);


}

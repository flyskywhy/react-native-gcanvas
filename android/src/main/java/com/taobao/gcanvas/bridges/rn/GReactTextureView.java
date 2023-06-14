package com.taobao.gcanvas.bridges.rn;

import android.content.Context;
import android.util.AttributeSet;
import android.util.Log;
import android.graphics.SurfaceTexture;
import android.view.TextureView;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.taobao.gcanvas.surface.GTextureView;

/**
 * View for ReactNative.
 * @author ertong
 *         create at 2018/1/23
 */

public class GReactTextureView extends GTextureView implements LifecycleEventListener, TextureView.SurfaceTextureListener {
    private boolean mIsReady = false;
    private SurfaceTexture mSurfaceTexture = null;
    private boolean mOnSurfaceTextureCreatedWithZeroSize = false;
    private ReactContext mContext;

    public GReactTextureView(Context context, String id) {
        super(context, id);
        mContext = (ReactContext)context;
        addSurfaceTextureListener(this);
    }

    public GReactTextureView(Context context, String id, AttributeSet attrs) {
        super(context, id, attrs);
        mContext = (ReactContext)context;
        addSurfaceTextureListener(this);
    }

    public GReactTextureView(Context context, String id, AttributeSet attrs, int defStyleAttr) {
        super(context, id, attrs, defStyleAttr);
        mContext = (ReactContext)context;
        addSurfaceTextureListener(this);
    }

    public GReactTextureView(Context context, String id, AttributeSet attrs, int defStyleAttr, int defStyleRes) {
        super(context, id, attrs, defStyleAttr, defStyleRes);
        mContext = (ReactContext)context;
        addSurfaceTextureListener(this);
    }

    @Override
    public void onHostResume() {
       resume();
    }

    @Override
    public void onHostPause() {
        pause();
    }

    @Override
    public void onHostDestroy() {
        setSurfaceTextureListener(null);
        requestExit();
    }

    public void manuallyDestroy() {
        Log.d("GReactTextureView", "manuallyDestroy");
        onHostDestroy();
    }

    public boolean isReady() {
        return mIsReady;
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        Log.d("GReactTextureView", "onSurfaceTextureAvailable width:" + width + " height:" + height);
        if (!mIsReady) {
            // onSurfaceTextureAvailable is sometimes called with 0 size texture
            // and immediately followed by onSurfaceTextureSizeChanged with actual size
            if (width == 0 || height == 0) {
                mOnSurfaceTextureCreatedWithZeroSize = true;
            }

            mIsReady = true;

            if (!mOnSurfaceTextureCreatedWithZeroSize) {
                if (mSurfaceTexture != null) {
                    // need onSurfaceTextureDestroyed() in
                    // android/gcanvas_library/src/main/java/com/taobao/gcanvas/surface/GTextureViewCallback.java
                    // return false to keep mSurfaceTexture not null to invoke meaningful
                    // 2nd onSurfaceTextureAvailable() here e.g. quit from a drawer item
                    // page to current canvas page which is still maintain mounted by
                    // react-navigation on Android, otherwise will no display
                    setSurfaceTexture(mSurfaceTexture);
                }
                onIsReady();
            }
        }
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
        Log.d("GReactTextureView", "onSurfaceTextureSizeChanged");
        if (mOnSurfaceTextureCreatedWithZeroSize && (width != 0 || height != 0)) {
            if (mSurfaceTexture != null) {
                setSurfaceTexture(mSurfaceTexture);
            }
            onIsReady();
            mOnSurfaceTextureCreatedWithZeroSize = false;
        }
    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
        Log.d("GReactTextureView", "onSurfaceTextureDestroyed");
        mIsReady = false;
        onIsReady();
        mSurfaceTexture = surface;

        // here return false means nothing, but because onSurfaceTextureDestroyed() in
        // android/gcanvas_library/src/main/java/com/taobao/gcanvas/surface/GTextureViewCallback.java
        // return false, then comes the manuallyDestroy() to invoke mSurface.release()
        return false;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surface) {
    }

    private void onIsReady() {
        mContext
            .getNativeModule(UIManagerModule.class)
            .getEventDispatcher()
            .dispatchEvent(new GReactViewEvent(getId(), mIsReady));
    }
}

/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */

#import "GCanvasPlugin.h"
#import "GCVCommon.h"
#import "GCVFont.h"
#import "GCVLog.h"

#include "GCanvasWeex.hpp"
#include "GCanvas2dContext.h"
#include "GCanvasManager.h"
#include "Log.h"

void nsLog(const char *tag, const char *log) {
    NSLog(@"%s: %s", tag, log);
}


@interface GCanvasPlugin()

@property(nonatomic, strong) NSString *componentId;
@property(nonatomic, assign) gcanvas::GCanvasWeex *gcanvas;
@property(nonatomic, assign) GCanvasContext *context;
@property(nonatomic, strong) NSMutableArray *renderCommandArray;
@property(nonatomic, strong) NSMutableDictionary *textureDict;
@property(nonatomic, assign) BOOL needDisableImageSmoothing;

@property(nonatomic, weak) GLKView *glkview;

@end

@implementation GCanvasPlugin

+ (void)setLogLevel:(NSUInteger)logLevel{
    if( logLevel < LOG_LEVEL_DEBUG || logLevel > LOG_LEVEL_FATAL ) return;
#ifdef DEBUG
    [GCVLog sharedInstance].logLevel = (GCVLogLevel)logLevel;
#endif
    SetLogLevel((LogLevel)logLevel);
}

+ (FetchPluginBlock)GetFetchPluginBlock{
    static FetchPluginBlock gFetchPluginBlock;
    return gFetchPluginBlock;
}

+ (void)setFetchPlugin:(FetchPluginBlock)block
{
    FetchPluginBlock fetchPluginBlock = [self GetFetchPluginBlock];
    fetchPluginBlock = block;
}


- (instancetype)initWithComponentId:(NSString*)componentId{
    self = [super init];

    // to get the log comes from cpp
    gcanvasSystemLog = nsLog;

    if (self){
        self.mGcanvasInitedSem = dispatch_semaphore_create(0);
//        self.mExecCommands = dispatch_semaphore_create(1);
        self.mSyncSem = dispatch_semaphore_create(0);
        self.renderCommandArray = [[NSMutableArray alloc] init];
        self.textureDict = NSMutableDictionary.dictionary;

        self.gcanvasInited = NO;
        self.needDisableImageSmoothing = NO; // default mImageSmoothingEnabled is true in core/src/gcanvas/GCanvasState.h
        self.componentId = componentId;

        gcanvas::GCanvasManager* manager = gcanvas::GCanvasManager::GetManager();
        std::string key = [componentId UTF8String];

        self.gcanvas = manager->NewCanvasWeex(key);
        self.context = self.gcanvas->GetGCanvasContext();

    // comment SetLogLevel below to
    // fix https://github.com/flyskywhy/react-native-gcanvas/issues/13 by let
    // SetLogLevel on iOS to be same behavior as Android
    // #ifdef DEBUG
    //     SetLogLevel(LOG_LEVEL_DEBUG);
    // #else
    //     SetLogLevel(LOG_LEVEL_INFO);
    // #endif
    }
    return self;
}

- (void)reInitContext{
    self.gcanvasInited = NO;
    if (self.gcanvas->GetContextType() == 0) {
        self.needDisableImageSmoothing = !self.context->ImageSmoothingEnabled();
    }
//    [self removeCommands];
    self.gcanvas->ReCreateContext();
    self.context = self.gcanvas->GetGCanvasContext();
}

- (void)dealloc{
    [self removeGCanvas];
}

- (void)setFrame:(CGRect)frame devicePixelRatio:(CGFloat)devicePixelRatio {
    if( !self.gcanvas ) return;
    if( !self.gcanvasInited ){
        self.gcanvas->OnSurfaceChanged(0, 0, frame.size.width, frame.size.height);

        // OnSurfaceChanged above will invoke GCanvasContext::InitializeGLEnvironment()
        // then invoke GCanvasContext::ResetStateStack() to init
        // GCanvasContext->mCurrentState so that SetImageSmoothingEnabled below can
        // set mCurrentState->mImageSmoothingEnabled
        if (self.needDisableImageSmoothing && self.gcanvas->GetContextType() == 0) {
            self.needDisableImageSmoothing = NO;
            self.context->SetImageSmoothingEnabled(NO);
        }

        GCVLOG_METHOD(@"enable devicePixelRatio %f", devicePixelRatio);
        self.context->SetDevicePixelRatio(devicePixelRatio);

        self.gcanvasInited = YES;
        dispatch_semaphore_signal(self.mGcanvasInitedSem);
    }
}

- (void)waitGcanvasInitedUtilTimeout{
    dispatch_semaphore_wait(self.mGcanvasInitedSem, dispatch_time(DISPATCH_TIME_NOW, 500 * 1000 * 1000));
}

- (void)setClearColor:(UIColor*)color{
    if( !self.gcanvas ) return;

    if( color ){
        CGFloat r, g, b, a;
        BOOL ret = [color getRed:&r green:&g blue:&b alpha:&a];
        if( ret ){
            GColorRGBA c;
            c.rgba.r = r;
            c.rgba.g = g;
            c.rgba.b = b;
            c.rgba.a = a;
            self.gcanvas->SetClearColor(c);
        }
    }
}

- (void)addCommands:(NSDictionary*)commands{
    if (commands[@"args"]) {
//        dispatch_semaphore_wait(self.mExecCommands, DISPATCH_TIME_FOREVER);
        @synchronized (self) {
            [self.renderCommandArray addObject:commands];
        }
    }
}

- (void)removeCommands{
    @synchronized (self) {
        [self.renderCommandArray removeAllObjects];
    }
}

- (void)execCommands{
    if( !self.gcanvas || !self.gcanvasInited ) return;

    @synchronized (self) {
        int count = (int)self.renderCommandArray.count;
        if (count == 0) {
            return;
        }

        // TODO: use dispatch_semaphore_wait instead of @synchronized to improve performance,
        // ref to [iOS中保证线程安全的几种方式与性能对比](https://www.cnblogs.com/fengmin/p/5662268.html)
        // dispatch_semaphore_wait(self.mExecCommands, DISPATCH_TIME_FOREVER);
        GCVLOG_METHOD(@"execCommands array.count:%d", count);
        for (int i = 0; i < count; i++) {
            NSString* cmd = self.renderCommandArray[i][@"args"];
            int cmdLen = (int)strlen(cmd.UTF8String);
            self.gcanvas->Render(cmd.UTF8String, cmdLen);
            if ([self.renderCommandArray[i][@"isSyncWithDisplay"] boolValue]) {
                // should not comes here, so use NSLog instead of GCVLOG_METHOD which only log when setLogLevel(LOG_LEVEL_DEBUG),
                // ref to the comment of "isSyncWithDisplay, start wait" in GCanvasModule.m
                NSLog(@"isSyncWithDisplay, end wait");
                dispatch_semaphore_signal(self.mSyncSem);
            }
        }
        [self removeCommands];
        // dispatch_semaphore_signal(self.mExecCommands);
        return;

#if 0
#if 1
//        if (count > 3) { // use this for not too much frameskip
//            count  = 3;
//        }
        NSString* cmd = self.renderCommandArray[0][@"args"];
        BOOL isSyncWithDisplay = [self.renderCommandArray[0][@"isSyncWithDisplay"] boolValue];
        NSMutableIndexSet *indexes = [NSMutableIndexSet indexSetWithIndex:0];
        for (int i = 1; i < count; i++) {
            cmd = [cmd stringByAppendingString:self.renderCommandArray[i][@"args"]];
            [indexes addIndex:i];
       }
        int cmdLen = (int)strlen(cmd.UTF8String);
        GCVLOG_METHOD(@"execCommands, frameskip:%d, len:%d, command=%@", count - 1, cmdLen, cmd);
        self.gcanvas->Render(cmd.UTF8String, cmdLen);
        [self.renderCommandArray removeObjectsAtIndexes:indexes];
#else // only exec last cmd comes from last 16ms with `setInterval(render, 16)` in `packages/gcanvas/src/env/canvas.js`, is enough for one drawInRect
        NSString* cmd = self.renderCommandArray[count - 1][@"args"];
        BOOL isSyncWithDisplay = [self.renderCommandArray[count - 1][@"isSyncWithDisplay"] boolValue];
        int cmdLen = (int)strlen(cmd.UTF8String);
        GCVLOG_METHOD(@"execCommands, frameskip:%d, len:%d, command=%@", count - 1, cmdLen, cmd);
        self.gcanvas->Render(cmd.UTF8String, cmdLen);
        [self.renderCommandArray removeAllObjects];
#endif
        if (isSyncWithDisplay == YES) {
            GCVLOG_METHOD(@"isSyncWithDisplay, end wait");
            dispatch_semaphore_signal(self.mSyncSem);
        }

        dispatch_semaphore_signal(self.mExecCommands);
#endif
    }
}

- (void)waitUtilTimeout{
    dispatch_semaphore_wait(self.mSyncSem, dispatch_time(DISPATCH_TIME_NOW, GCANVAS_TIMEOUT * 1000 * 1000));
}

- (void)releaseManager{
    gcanvas::GCanvasManager::Release();
}

- (void)removeGCanvas{
    gcanvas::GCanvasManager* manager = gcanvas::GCanvasManager::GetManager();
    manager->RemoveCanvas([self.componentId UTF8String]);

    @synchronized(self){
        [self.textureDict enumerateKeysAndObjectsUsingBlock:^(id  key, id value, BOOL * _Nonnull stop) {
            GLuint tid = (GLuint)[value integerValue];
            if(tid > 0){
                glDeleteTextures(1, &tid);
            }
        }];
        [self.textureDict removeAllObjects];
        self.textureDict = nil;
    }

    self.gcanvas = nil;
}

- (GLuint)getTextureId:(NSUInteger)aid{
    if( !self.gcanvas ) return 0;

    @synchronized(self){
        GLuint tid = (GLuint)([self.textureDict[@(aid)] integerValue]);
        return tid;
    }
}

- (void)addTextureId:(NSUInteger)tid withAppId:(NSUInteger)aid width:(NSUInteger)width height:(NSUInteger)height offscreen:(BOOL)offscreen{
    if( !self.gcanvas ) return;

    self.gcanvas->AddTexture((int)aid, (int)tid, (int)width, (int)height);
    if( offscreen ){
        self.gcanvas->AddOfflineTexture((int)aid, (int)tid);
    }
    @synchronized(self){
        self.textureDict[@(aid)] = @(tid);
    }
}

- (void)addTextureId:(NSUInteger)tid withAppId:(NSUInteger)aid width:(NSUInteger)width height:(NSUInteger)height{
    [self addTextureId:tid withAppId:aid width:width height:height offscreen:NO];
}

- (void)setImageLoader:(id<GCVImageLoaderProtocol>)loader{
    [GCVCommon sharedInstance].imageLoader = loader;
}

- (void)setDevicePixelRatio:(double)ratio{
    if( !self.gcanvas ) return;

    self.gcanvas->SetDevicePixelRatio(ratio);
}

- (void)setContextType:(GCVContextType)contextType{
    if( !self.gcanvas ) return;

    self.gcanvas->SetContextType((GCVContextTypeWebGL == contextType ) ? GCVContextTypeWebGL : GCVContextType2D);

    //register function for GFont and WebGL texImage2D && texSubImage2D.
    if( self.gcanvas->GetContextType() != 0 ){
        self.context->SetGWebGLTxtImage2DFunc(iOS_GCanvas_GWebGLTxtImage2D);
        self.context->SetGWebGLTxtSubImage2DFunc(iOS_GCanvas_GWebGLTxtSubImage2D);
        self.context->SetGWebGLBindToGLKViewFunc(iOS_GCanvas_Bind_To_GLKView);
    }
}

- (int)contextType{
    if( !self.gcanvas ) return 0;
    return self.gcanvas->GetContextType();
}

- (void)GetImageData:(int)x y:(int)y width:(int)width height:(int)height rgbaData:(uint8_t *)rgbaData {
    if (self.gcanvas) {
        self.gcanvas->GetImageDataWithoutStringCmd(x, y, width, height, rgbaData);
    }
}

- (void)DoDrawImageData:(float)tw th:(float)th rgbaData:(const uint8_t *)rgbaData sx:(float)sx sy:(float)sy sw:(float)sw sh:(float)sh dx:(float)dx dy:(float)dy dw:(float)dw dh:(float)dh {
    if (self.gcanvas) {
        self.gcanvas->DrawImageDataWithoutStringCmd(tw, th, rgbaData, sx, sy, sw, sh, dx, dy, dw, dh);
    }
}

- (CGFloat)fps{
    if( !self.gcanvas ) return 0;
    return self.gcanvas->mFps;
}

- (GLuint)textureId{
    if( !self.gcanvas ) return 0;
    return self.gcanvas->GetFboTexture()->GetTextureID();
}

- (NSString*)getSyncResult{
    if( !self.gcanvas ) return @"";

   if( !self.gcanvas->mResult.empty() ){
        NSString *retResult = [[NSString alloc] initWithUTF8String:self.gcanvas->mResult.c_str()];
        self.gcanvas->setSyncResult("");
        return retResult;
    }
    return @"";
}

- (void)setGLKView:(GLKView*)glkview{
    self.glkview = glkview;
}

- (GLKView*)getGLKView{
    return self.glkview;
}



#pragma mark - iOS implementation of Font & texImage
/**
 * Fetch GCVImageCache by image source, create texImage2D with imageData.
 * create textImage2D success, while imageCache loaded.
 *
 * @param target            texutre target to render
 * @param level             level
 * @param internalformat    internalformat
 * @param format            format
 * @param type              type
 * @param src               image src to loader
 *
 */
void iOS_GCanvas_GWebGLTxtImage2D(GLenum target, GLint level, GLenum internalformat,
                                  GLenum format, GLenum type,  const char *src){
    NSString *imageStr = [[NSString alloc] initWithUTF8String:src];
    GCVImageCache *imageCache = [[GCVCommon sharedInstance] fetchLoadImage:imageStr];

    void (^glTexImage2DBlock)(GCVImageCache*) = ^(GCVImageCache* cache){
        LOG_D("width=%f, height=%f, image=%p", imageCache.width, imageCache.height, imageCache.image);

        GLint width = imageCache.width;
        GLint height = imageCache.height;

        CGRect rect = CGRectMake(0, 0, width, height);
        CGBitmapInfo info =  kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big;
        NSMutableData *pixelData = [NSMutableData dataWithLength:width*height*4];

        CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
        CGContextRef context = CGBitmapContextCreate(pixelData.mutableBytes, width, height, 8, 4 * width, colorSpace, info);
        CGColorSpaceRelease(colorSpace);
        CGContextClearRect(context, rect);
        CGContextDrawImage(context, rect, imageCache.image.CGImage);
        CGContextRelease(context);

        glTexImage2D(target, level, internalformat, width, height, 0, format, type, pixelData.bytes);
    };

    if( imageCache ) {
        glTexImage2DBlock(imageCache);
    } else {
        [[GCVCommon sharedInstance] addPreLoadImage:imageStr completion:^(GCVImageCache *imageCache, BOOL fromCache){
            if( imageCache ){
                glTexImage2DBlock(imageCache);
            }
        }];
    }
}

/**
 * Fetch GCVImageCache by image source, create texImage2D with imageData.
 * create textImage2D success, while imageCache loaded.
 *
 * @param target            texutre target to render
 * @param level             level
 * @param xoffset           xoffset
 * @param yoffset           yoffset
 * @param format            format
 * @param type              type
 * @param src               image src to loader
 *
 */
void iOS_GCanvas_GWebGLTxtSubImage2D(GLenum target, GLint level, GLint xoffset, GLint yoffset,
                                     GLenum format, GLenum type,  const char *src){
    NSString *imageStr = [[NSString alloc] initWithUTF8String:src];
    GCVImageCache *imageCache = [[GCVCommon sharedInstance] fetchLoadImage:imageStr];

    void (^glTexSubImage2DBlock)(GCVImageCache*) = ^(GCVImageCache* cache){
        LOG_D("width=%f, height=%f, image=%p", imageCache.width, imageCache.height, imageCache.image);

        GLint width = imageCache.width;
        GLint height = imageCache.height;

        CGRect rect = CGRectMake(0, 0, width, height);
        CGBitmapInfo info =  kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big;
        NSMutableData *pixelData = [NSMutableData dataWithLength:width*height*4];

        CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
        CGContextRef context = CGBitmapContextCreate(pixelData.mutableBytes, width, height, 8, 4 * width, colorSpace, info);
        CGColorSpaceRelease(colorSpace);
        CGContextClearRect(context, rect);
        CGContextDrawImage(context, rect, imageCache.image.CGImage);
        CGContextRelease(context);

        glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData.bytes);
    };

    if( imageCache ){
        glTexSubImage2DBlock(imageCache);
    } else {
        [[GCVCommon sharedInstance] addPreLoadImage:imageStr completion:^(GCVImageCache *imageCache, BOOL fromCache){
            if( imageCache ){
                glTexSubImage2DBlock(imageCache);
            }
        }];
    }
}

void iOS_GCanvas_Bind_To_GLKView(std::string contextId){
    if( [GCanvasPlugin GetFetchPluginBlock] ){
        FetchPluginBlock block = [GCanvasPlugin GetFetchPluginBlock];
        GCanvasPlugin *plugin = block([NSString stringWithUTF8String:contextId.c_str()]);
        GLKView *glkview = [plugin getGLKView];
        [glkview bindDrawable];
    }
}


@end

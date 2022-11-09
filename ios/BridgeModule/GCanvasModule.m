/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

#import "GCanvasModule.h"
#import "GCanvasObject.h"
#import "GCanvasViewProtocol.h"
#import "GCVCommon.h"

#define kGCanvasOffScreenPrefix @"offscreen_"

#ifndef dispatch_main_sync_safe
#define dispatch_main_sync_safe(block)\
    if ([NSThread isMainThread]) {\
    block();\
    } else {\
    dispatch_sync(dispatch_get_main_queue(), block);\
    }
#endif

#ifndef dispatch_main_async_safe
#define dispatch_main_async_safe(block)\
    if ([NSThread isMainThread]) {\
    block();\
    } else {\
    dispatch_async(dispatch_get_main_queue(), block);\
    }
#endif

@interface GCanvasModule()<GLKViewDelegate>

/**
 * cache GCanvasObject by componentId
 */
@property (nonatomic, strong) NSMutableDictionary *gcanvasObjectDict;

/**
 * enter background flag
 */
@property (nonatomic, assign) BOOL enterBackground;

/**
 * dispatch queue only for preload image
 */
@property (nonatomic, strong) dispatch_queue_t preloadQueue;

@end

@implementation GCanvasModule

#pragma mark - CreateEAGLContext
/**
 * Create EAGLContext by the same EAGLSharegroup
 */
static EAGLContext          *_staticFirstContext;
static NSMutableDictionary  *_staticModuleExistDict;
+ (EAGLContext*)createEAGLContextWithModuleInstance:(NSString*)instanceId{
    EAGLContext *context = nil;
    if( !_staticFirstContext ){
        _staticFirstContext = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES2];
        context = _staticFirstContext;
    } else {
        EAGLContext *newContext = [[EAGLContext alloc] initWithAPI:kEAGLRenderingAPIOpenGLES2 sharegroup:_staticFirstContext.sharegroup];
        context = newContext;
    }

    if( !_staticModuleExistDict ){
        _staticModuleExistDict = NSMutableDictionary.dictionary;
    }

    if( !_staticModuleExistDict[instanceId] ){
        _staticModuleExistDict[instanceId] = @(1);
    }

    return context;
}

- (instancetype)initWithDelegate:(nonnull id<GCanvasModuleProtocol>)delegate{
    if( self = [super init] ){
        _deletage = delegate;
    }
    return self;
}

- (void)dealloc{
    [NSObject cancelPreviousPerformRequestsWithTarget:self];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

/**
 * return the execute queue for the module
 */
- (dispatch_queue_t)gcanvasExecuteQueue{
    static dispatch_queue_t gcanvasQueue;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        gcanvasQueue = dispatch_queue_create("com.taobao.gcanvas", DISPATCH_QUEUE_SERIAL);
    });
    return gcanvasQueue;
}

- (NSString*)enable:(NSDictionary *)args{
    if (!args || !args[@"componentId"] ){
        return @"false";
    }

    NSString *componentId = args[@"componentId"];
    GCVLOG_METHOD(@"enable:, componentId=%@", componentId);

    if( !self.gcanvasObjectDict ){
        self.gcanvasObjectDict = NSMutableDictionary.dictionary;
        self.enterBackground = NO;

        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onGCanvasCompLoadedNotify:)
                                                     name:kGCanvasCompLoadedNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onGCanvasCompUnloadedNotify:)
                                                     name:kGCanvasCompUnloadedNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onGCanvasResetNotify:)
                                                     name:kGCanvasResetNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onInstanceWillDestroy:)
                                                     name:kGCanvasDestroyNotification
                                                   object:nil];

        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onDidEnterBackgroundNotify:)
                                                     name:UIApplicationWillResignActiveNotification
                                                   object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(onWillEnterForegroundNotify:)
                                                     name:UIApplicationDidBecomeActiveNotification
                                                   object:nil];
        GCVWeakSelf
        [GCanvasPlugin setFetchPlugin:^GCanvasPlugin *(NSString *componentId) {
            return [weakSelf gcanvasPluginById:componentId];
        }];
    }

    if( self.gcanvasObjectDict[componentId] ){
        return @"true";
    }

    GCanvasObject *gcanvasInst = [[GCanvasObject alloc] initWithComponentId:componentId];
    self.gcanvasObjectDict[componentId] = gcanvasInst;

    GCanvasPlugin *plugin = [[GCanvasPlugin alloc] initWithComponentId:componentId];
    gcanvasInst.plugin = plugin;

    GCVWeakSelf
    id<GCanvasViewProtocol> component = [self.deletage gcanvasComponentById:componentId];
    if( component ){
        dispatch_sync([self gcanvasExecuteQueue], ^{
            EAGLContext *context = [GCanvasModule createEAGLContextWithModuleInstance:[weakSelf.deletage gcanvasModuleInstanceId]];
            context.multiThreaded = YES;
            component.glkview.context = context;
            component.glkview.delegate = weakSelf;
        });
        gcanvasInst.component = component;

        [plugin setGLKView:component.glkview];
    }
    return @"true";
}

- (void)disable:(NSString*)componentId{
    GCVLOG_METHOD(@"disable:, componentId=%@", componentId);

    [[NSNotificationCenter defaultCenter] postNotificationName:kGCanvasCompUnloadedNotification
                                                        object:nil
                                                      userInfo:@{@"componentId":componentId}];
}

#pragma mark - Need Export Context2D Method
/**
 * Export JS method for reset GCanvas component while disappear
 * [iOS only]
 *
 * @param   componentId GCanvas component identifier
 */
- (void)resetComponent:(NSString*)componentId{
    GCVLOG_METHOD(@"resetComponent:,componentId=%@", componentId);

    [[NSNotificationCenter defaultCenter] postNotificationName:kGCanvasResetNotification
                                                        object:nil
                                                      userInfo:@{@"componentId":componentId}];
}

/**
 * Export JS method for preloading image
 *
 * @param   data        NSArray, contain 2 item
 *          data[0]     image source,
 *          data[1]     fake texture id(auto-increment id)of GCanvasImage in JS
 * @param   callback    GCanvasModuleCallback callback
 */
- (void)preLoadImage:(NSArray *)data callback:(GCanvasModuleCallback)callback{
    if( !data || ![data isKindOfClass:NSArray.class] || data.count != 2){
        if( callback ) callback(@{@"error":@"Input Param Error"});
        return;
    }

    if( ![GCVCommon sharedInstance].imageLoader ){
        [GCVCommon sharedInstance].imageLoader = self.imageLoader;
    }

    if( !self.preloadQueue ){
        self.preloadQueue = dispatch_queue_create("com.taobao.gcanvas.preload", DISPATCH_QUEUE_CONCURRENT);
    }

    NSString *src = data[0];
    if( [src hasPrefix:kGCanvasOffScreenPrefix] ){
        if( callback ) callback(@{});
        return;
    }

    GCVLOG_METHOD(@"preLoadImage:callback:, src=%@", src);
    dispatch_async(self.preloadQueue , ^{
        NSUInteger jsTextureId = [data[1] integerValue];
        [[GCVCommon sharedInstance] addPreLoadImage:src completion:^(GCVImageCache *imageCache, BOOL fromCache) {
            if ( !imageCache ){
                if( callback ) callback(@{@"error":@"Preload Image Error"});
                return;
            }
            imageCache.jsTextreId = jsTextureId;
            if( callback) {
                callback(@{@"width":@(imageCache.width), @"height":@(imageCache.height)});
            }
        }];
    });
}

- (void)drawCanvas2Canvas:(NSDictionary*)dict {
    if (!dict || ![dict isKindOfClass:NSDictionary.class]) {
        return;
    }

    NSString *srcComponentId = dict[@"srcComponentId"];
    NSString *componentId = dict[@"dstComponentId"];
    NSUInteger tw = [dict[@"tw"] integerValue];
    NSUInteger th = [dict[@"th"] integerValue];
    NSUInteger sx = [dict[@"sx"] integerValue];
    NSUInteger sy = [dict[@"sy"] integerValue];
    NSUInteger sw = [dict[@"sw"] integerValue];
    NSUInteger sh = [dict[@"sh"] integerValue];
    NSUInteger dx = [dict[@"dx"] integerValue];
    NSUInteger dy = [dict[@"dy"] integerValue];
    NSUInteger dw = [dict[@"dw"] integerValue];
    NSUInteger dh = [dict[@"dh"] integerValue];

    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    id<GCanvasViewProtocol> component = gcanvasInst.component;
    if (!component || !plugin || !plugin.gcanvasInited) {
        return;
    }

    GCanvasObject *sCanvasInst = self.gcanvasObjectDict[srcComponentId];
    GCanvasPlugin *sPlugin = sCanvasInst.plugin;
    if (!sCanvasInst || !sPlugin || !sPlugin.gcanvasInited) {
        return;
    }
    id<GCanvasViewProtocol> sComponent = sCanvasInst.component;
    if (!sComponent) {
        return;
    }

    GCVLOG_METHOD(@"srcComponentId:%@ componentId:%@", srcComponentId, componentId);

    uint8_t *pixels = (uint8_t*)malloc(tw * th * 4);

    [EAGLContext setCurrentContext:sComponent.glkview.context];
    [sPlugin GetImageData:0 y:0 width:(int)tw height:(int)th rgbaData:pixels];

    [EAGLContext setCurrentContext:component.glkview.context];
    [plugin DoDrawImageData:tw th:th rgbaData:pixels sx:sx sy:sy sw:sw sh:sh dx:dx dy:dy dw:dw dh:dh];

    free(pixels);
}

/**
 * Export JS method for binding image to real native texture
 *
 * @param   data        NSArray, contain 2 item
 *          data[0]     image source,
 *          data[1]     fake texture id(auto-increment id)of GCanvasImage in JS
 * @param   componentId GCanvas component identifier
 * @param   callback    GCanvasModuleCallback callback
 */
- (void)bindImageTexture:(NSArray *)data componentId:(NSString*)componentId callback:(GCanvasModuleCallback)callback{
    if( !data || ![data isKindOfClass:NSArray.class] || data.count != 2){
        if( callback ) callback(@{@"error":@"Input Param Error"});
        return;
    }

    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    id<GCanvasViewProtocol> component = gcanvasInst.component;
    if (!component || !plugin || !plugin.gcanvasInited) {
        if( callback ) callback(@{});
        return;
    }

    NSString *src = data[0];
    NSUInteger jsTextureId = [data[1] integerValue];

    GCVLOG_METHOD(@"bindImageTexture:componentId:callback:, src=%@", src);

    __block GLuint textureId = [plugin getTextureId:jsTextureId];
    if( textureId == 0 ){
        //check offscreen
        NSRange range = [src rangeOfString:kGCanvasOffScreenPrefix];
        if( range.location == 0 ){
            NSString *orgComponentId = [src substringFromIndex:range.length];
            GCanvasObject *gcanvasInst = self.gcanvasObjectDict[orgComponentId];
            GCanvasPlugin *orgPlugin = gcanvasInst.plugin;
            id<GCanvasViewProtocol> orgComponent = gcanvasInst.component;
            if( orgPlugin  && orgComponent ){
                orgComponent.glkview.hidden = YES;
                [plugin addTextureId:[orgPlugin textureId] withAppId:jsTextureId
                               width:orgComponent.componetFrame.size.width
                              height:orgComponent.componetFrame.size.height
                           offscreen:YES];
            }
            if( callback ) callback(@{});
            return;
        }

        void (^bindImageTextureBlock)(GCVImageCache*) = ^(GCVImageCache* cache){
            dispatch_main_async_safe(^{
                [EAGLContext setCurrentContext:component.glkview.context];
                textureId = [GCVCommon bindTexture:cache.image];
                if( textureId > 0 ){
                    GCVLOG_METHOD(@"==>bindImageTexture success: jsTextureId:%d => texutreId:%d, componentId:%@", jsTextureId, textureId, componentId);

                    [plugin addTextureId:textureId withAppId:jsTextureId
                                   width:cache.width height:cache.height
                               offscreen:NO];
                    [[GCVCommon sharedInstance] removeLoadImage:src];
                }
            });
        };

        GCVImageCache *imageCache = [[GCVCommon sharedInstance] fetchLoadImage:src];
        if( !imageCache ){
            [[GCVCommon sharedInstance] addPreLoadImage:src completion:^(GCVImageCache *imageCache, BOOL fromCache) {
                bindImageTextureBlock(imageCache);
                if( callback ){
                    (textureId > 0) ? callback(@{}) : callback(@{@"error":@"Bind Image To Texture Error"});
                }
            }];
            return;
        } else {
            bindImageTextureBlock(imageCache);
        }
    }

    if( callback ){
        (textureId > 0) ? callback(@{}) : callback(@{@"error":@"Bind Image To Texture Error"});
    }
}

/**
 * Export JS method  set GCanvas plugin contextType
 * @param   type    see GCVContextType
 */
- (void)setContextType:(NSUInteger)type componentId:(NSString*)componentId{
    GCVLOG_METHOD(@"setContextType:componentId:, type:%d, componentId:%@", (unsigned long)type, componentId);
    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    if( plugin ){
        [plugin setContextType:(int)type];

        // since now `component.needChangeEAGLContenxt == YES`
        // since now `component.glkview.delegate != nil` so that drawInRect() will be invoked by setNeedsDisplay()
        // let `plugin setClearColor` be invoked in refreshPlugin() at the very first, otherwise can't
        // `gl.clearColor` right away on canvas.getContext('webgl') like https://github.com/flyskywhy/react-native-gcanvas/issues/24
        //
        // and with 2d, can let the first not second GCanvas.GBridge.callNative() display graphics on screen
        id<GCanvasViewProtocol> component = gcanvasInst.component;
        if (component) {
            dispatch_main_sync_safe(^{
                [component.glkview setNeedsDisplay];
            });
            [plugin waitGcanvasInitedUtilTimeout];
        }
    }
}

- (void)resetGlViewport:(NSString*)componentId{
    @synchronized (self) {
        GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
        GCanvasPlugin *plugin = gcanvasInst.plugin;
        if (!plugin || !plugin.gcanvasInited) {
            return;
        }

        GCVLOG_METHOD(@"componentId:%@", componentId);
        int contextType = plugin.contextType;
        [plugin reInitContext];
        [plugin setContextType:contextType];
        gcanvasInst.component.needChangeEAGLContenxt = YES;

        // ref to comment in setContextType() above
        // TODO: `component.glkview.delegate = weakSelf;` for webgl? but webgl just seems working well after resetGlViewport() when canvas resize
        id<GCanvasViewProtocol> component = gcanvasInst.component;
        if (component) {
            dispatch_main_sync_safe(^{
                [component.glkview setNeedsDisplay];
            });
            [plugin waitGcanvasInitedUtilTimeout];
        }
    }
}

- (NSString*)toDataURL:(NSString*)componentId mimeType:(NSString*)mimeType quality:(CGFloat)quality {
    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    if( !gcanvasInst ){
        return @"";
    }

    if (gcanvasInst.component) {
        __block UIImage *image;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIGraphicsBeginImageContextWithOptions(gcanvasInst.component.glkview.bounds.size, NO, [UIScreen mainScreen].scale);
            [gcanvasInst.component.glkview drawViewHierarchyInRect:gcanvasInst.component.glkview.frame afterScreenUpdates:YES];
            image = UIGraphicsGetImageFromCurrentImageContext();
            UIGraphicsEndImageContext();
        });

        NSData *data;
        NSString *base64Str = @"data:image/png;base64,";
        if ([mimeType isEqualToString:@"image/jpeg"]) {
            data = UIImageJPEGRepresentation(image, quality);
            base64Str = @"data:image/jpeg;base64,";
        } else {
            data = UIImagePNGRepresentation(image);
        }

        return [base64Str stringByAppendingString:[data base64EncodedStringWithOptions:0]];
    } else {
        return @"";
    }
}

/**
 * Export JS method  set log level
 * @param   level  loglevel 0-debug,1-info,2-warn,3-error
 */
- (void)setLogLevel:(NSUInteger)level{
    GCVLOG_METHOD(@"setLogLevel:, loglevel:%d", level);

    [GCanvasPlugin setLogLevel:level];
}

#pragma mark - Notification
- (void)onGCanvasCompLoadedNotify:(NSNotification*)notification{
    NSLog(@"onGCanvasCompLoadedNotify...");
}

- (void)onGCanvasCompUnloadedNotify:(NSNotification*)notification{
    NSString *componentId = notification.userInfo[@"componentId"];

    [self.gcanvasObjectDict enumerateKeysAndObjectsUsingBlock:^(NSString *compId, GCanvasObject *gcanvasInst, BOOL * _Nonnull stop) {
        if ( [componentId isEqualToString:gcanvasInst.componentId] &&  gcanvasInst.component ) {
            id<GCanvasViewProtocol> comp = gcanvasInst.component;
            comp.glkview.delegate = nil;

            GCanvasPlugin *plugin = gcanvasInst.plugin;
            [plugin removeGCanvas];
            [plugin removeCommands];
        }
    }];

    [self.gcanvasObjectDict removeObjectForKey:componentId];

    [_staticModuleExistDict removeObjectForKey:[self.deletage gcanvasModuleInstanceId]];
}

- (void)onGCanvasResetNotify:(NSNotification*)notification{
    NSString *componentId = notification.userInfo[@"componentId"];

    //find plugin and component bind with componentId, set needChangeEAGLContenxt and remove render commands
    [self.gcanvasObjectDict enumerateKeysAndObjectsUsingBlock:^(NSString *compId, GCanvasObject *gcanvsInst, BOOL * _Nonnull stop) {
        if ( [componentId isEqualToString:gcanvsInst.componentId] &&  gcanvsInst.component ) {
            gcanvsInst.component.needChangeEAGLContenxt = YES;
            GCanvasPlugin *plugin = gcanvsInst.plugin;
            [plugin removeCommands];
        }
    }];
}

- (void)onDidEnterBackgroundNotify:(NSNotification*)notification{
    self.enterBackground = YES;
}

- (void)onWillEnterForegroundNotify:(NSNotification*)notification{
    self.enterBackground = NO;
}

- (void)onInstanceWillDestroy:(NSNotification*)notification{
    NSString *instanceId = notification.userInfo[@"instanceId"];
    if( ![instanceId isEqualToString:[self.deletage gcanvasModuleInstanceId]] ){
        return;
    }

    [self.gcanvasObjectDict enumerateKeysAndObjectsUsingBlock:^(id  _Nonnull key, GCanvasObject* gcanvasInst, BOOL * _Nonnull stop) {
        id<GCanvasViewProtocol> comp = gcanvasInst.component;
        comp.glkview.delegate = nil;

        GCanvasPlugin *plugin = gcanvasInst.plugin;
        [plugin removeGCanvas];
    }];

    [self.gcanvasObjectDict removeAllObjects];
    self.gcanvasObjectDict = nil;

    [[GCVCommon sharedInstance] clearLoadImageDict];

    [_staticModuleExistDict removeObjectForKey:instanceId];
    if( _staticModuleExistDict.count == 0 ){
        _staticFirstContext = nil;
    }
}

#pragma mark - Private
- (GCanvasPlugin*)gcanvasPluginById:(NSString*)componentId{
    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    return plugin;
}

- (GCanvasObject*)gcanvasInstanceByGLKView:(GLKView*)glkview{
    __block GCanvasObject *gcanvasInst = nil;
    [self.gcanvasObjectDict enumerateKeysAndObjectsUsingBlock:^(id  _Nonnull key, GCanvasObject *obj, BOOL * _Nonnull stop) {
        if( obj.component.glkview == glkview ){
            gcanvasInst = obj;
            *stop = YES;
        }
    }];
    return gcanvasInst;
}

- (NSDictionary*)execCommandById:(NSString*)componentId type:(NSUInteger)type{
    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    id<GCanvasViewProtocol> component = gcanvasInst.component;
    GCanvasPlugin *plugin = gcanvasInst.plugin;

    BOOL isWebgl = (type >> 30 & 0x01) == 1;
    BOOL isSync = type >> 29 & 0x01; // sync RN method
    BOOL isExecWithDisplay = type & 0x01; // render per e.g. 16 ms

    if (isWebgl) {
        // WebGL no need set glkview delegate
        if (component.glkview.delegate) {
            // if comes here, drawInRect() will not be invoked after setNeedsDisplay(),
            // but setNeedsDisplay() is still need be invoked per e.g. 16 ms, otherwise
            // there will be no new graphics on screen
            component.glkview.delegate = nil;
        }

        if (component.needChangeEAGLContenxt) {
            [EAGLContext setCurrentContext:component.glkview.context];

            [self refreshPlugin:plugin withComponent:component];
            component.needChangeEAGLContenxt = NO;

            // setNeedsDisplay at first, https://github.com/alibaba/GCanvas said "for WebGL case render only once",
            // but https://github.com/flyskywhy/react-native-gcanvas found need be invoked per e.g. 16 ms as described
            // above, so maybe there is something TODO? (to improve performance?)
            dispatch_main_sync_safe(^{
                [component.glkview setNeedsDisplay];
            });
        }
    }

    if (component.isOffscreen) {
        component.glkview.hidden = YES;
    }

    // Test with ContextType webgl, if move `execCommands` code line after setNeedsDisplay code line will cause display
    // issue even hack `commands = viewportArgs + ';' + commands;` in `packages/gcanvas/src/bridge/react-native.js` ,
    // besides ref to https://stackoverflow.com/questions/27613134/why-do-i-need-to-call-glclear-in-drawinrect
    // and found can `execCommands` here or in drawInRect() invoked by setNeedsDisplay() , I choose `execCommands` here.
    // if (true) {
    // Test with ContextType 2d, if use `if (true) {` above to want exec cmd then setNeedsDisplay() just
    // like exec cmd then eglSwapBuffers() on Android in execWithDisplay, will cause some display issue,
    // even will crash if remove `[plugin execCommands]` in drawInRect() with sync and execWithDisplay
    // and long commands test with 'lightener' tool of https://github.com/flyskywhy/PixelShapeRN , so
    // need use `if (!isExecWithDisplay) {` below.
    if (
        !isExecWithDisplay ||
        // with ContextType webgl, because `component.glkview.delegate = nil;` will cause drawInRect()
        // not be invoked by setNeedsDisplay() in execWithDisplay, so need exec cmd here
        (isExecWithDisplay && component.glkview.delegate == nil)
    ) {
        // need setCurrentContext() before exec some gl ops,
        // ref to https://stackoverflow.com/questions/14021682/glgetintegervgl-viewport-rect-returns-gl-invalid-enum-on-ios
        // and https://stackoverflow.com/questions/13953755/glgenvertexarraysoes-returns-a-zero-vao-on-ios-sometimes
        // and https://developer.apple.com/forums/thread/29129
        [EAGLContext setCurrentContext:component.glkview.context];
        [plugin execCommands];
    }

    if (isExecWithDisplay) {
        GCVWeakSelf
        if (isWebgl) {
            dispatch_main_sync_safe(^{
                if( !weakSelf.enterBackground ){
                    [component.glkview setNeedsDisplay];
                }
            });
        } else {
            dispatch_main_async_safe(^{
                if( !weakSelf.enterBackground ){
                    [component.glkview setNeedsDisplay];
                }
            });
        }
    }

    if (isSync) {
        if (isExecWithDisplay && component.glkview.delegate != nil) {
            // I'm wondering which command comes here, since 'low JS FPS' described in
            // callNative() of `react-native-gcanvas/packages/gcanvas/src/bridge/react-native.js`
            NSLog(@"isSyncWithDisplay, start wait");
            [plugin waitUtilTimeout];
        }

        NSString *result = [plugin getSyncResult];
        GCVLOG_METHOD(@"call native sync result: %@", result);
        if (result) {
            return @{@"result":result};
        }
    }

    return @{@"result":@""};
}

/**
 * reset and refresh GCanvas Plugin
 *
 * @param   plugin      the GCanvasPlugin object to refresh
 * @param   component   id<GCanvasViewProtocol component bind with plugin
 */
- (void)refreshPlugin:(GCanvasPlugin*)plugin withComponent:(id<GCanvasViewProtocol>)component{
    dispatch_main_sync_safe(^{
        CGRect compFrame = component.componetFrame;
        CGRect gcanvasFrame = CGRectMake(compFrame.origin.x, compFrame.origin.y,
                                         compFrame.size.width*component.devicePixelRatio,
                                         compFrame.size.height*component.devicePixelRatio);
        [plugin setClearColor:component.glkview.backgroundColor];
        [plugin setFrame:gcanvasFrame devicePixelRatio:component.devicePixelRatio];
    });
}

- (void)setDevicePixelRatio:(NSString*)componentId ratio:(CGFloat)ratio {
    GCVLOG_METHOD(@"setDevicePixelRatio:componentId:%@, ratio:%f", componentId, ratio);
    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    if (plugin) {
        [plugin setDevicePixelRatio:ratio];
    }
}

#pragma mark - GLKViewDelegate
- (void)glkView:(GLKView*)view drawInRect:(CGRect)rect{
    GCanvasObject *gcanvasInst = [self gcanvasInstanceByGLKView:view];

    id<GCanvasViewProtocol> component = gcanvasInst.component;
    GCanvasPlugin *plugin = gcanvasInst.plugin;

    if( !component || !plugin ){
        return;
    }

    GCVLOG_METHOD(@"glkView:drawInRect:, componentId:%@, context:%p", component.componentId, component.glkview.context);

    //multi GCanvas instance, need change current context while execute render commands
    [EAGLContext setCurrentContext:component.glkview.context];

    if ( component.needChangeEAGLContenxt ){
        [self refreshPlugin:plugin withComponent:component];
        if( [self.deletage respondsToSelector:@selector(dispatchGlobalEvent:params:)] ){
            [self.deletage dispatchGlobalEvent:@"GCanvasReady" params:@{@"ref":component.componentId}];
        }
        component.needChangeEAGLContenxt = NO;
    }

    [plugin execCommands];
}

#pragma mark - Need Export Async RN Method
- (void)render:(NSString *)componentId commands:(NSString*)commands type:(NSUInteger)type{
    if (self.enterBackground) {
        return;
    }

    GCVLOG_METHOD(@"render(async RN): componentId=%@, isExecWithDisplay=%d, commands=%@", componentId, type & 0x01, commands);

    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    if (!gcanvasInst) {
        return;
    }
    id<GCanvasViewProtocol> component = gcanvasInst.component;
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    if (!component || !plugin || !plugin.gcanvasInited) {
        return;
    }

    if (![commands isEqualToString:@""]) {
        [plugin addCommands:@{
            @"isSyncWithDisplay": @NO,
            @"args": commands,
        }];
    }

    [self execCommandById:componentId type:type];
}

#pragma mark - Need Export Sync RN Method
- (NSDictionary*)extendCallNative:(NSDictionary*)dict{
    NSString *componentId = dict[@"contextId"];
    NSUInteger type = [dict[@"type"] integerValue];
    NSString *args = dict[@"args"];
    NSDictionary *retDict = @{@"result":@""};

    GCVLOG_METHOD(@"extendCallNative(sync RN): componentId=%@, isExecWithDisplay=%d, commands=%@", componentId, type & 0x01, args);

    GCanvasObject *gcanvasInst = self.gcanvasObjectDict[componentId];
    if (!gcanvasInst) {
        return retDict;
    }
    id<GCanvasViewProtocol> component = gcanvasInst.component;
    GCanvasPlugin *plugin = gcanvasInst.plugin;
    if (!component || !plugin) {
        return retDict;
    }
    if (!component || !plugin || !plugin.gcanvasInited) {
        GCVLOG_METHOD(@"plugin.gcanvasInited:%d", plugin.gcanvasInited);
        return retDict;
    }

    if (![args isEqualToString:@""]) {
        BOOL isWebgl = (type >> 30 & 0x01) == 1;
        if (isWebgl) {
            [plugin addCommands:@{
                // webgl will `component.glkview.delegate = nil;`,thus even setNeedsDisplay()
                // in execWithDisplay, will not invoke drawInRect(), thus no need to
                // waitUtilTimeout() cmd exec indirectly by drawInRect()
                @"isSyncWithDisplay": @NO,
                @"args": args,
            }];
        } else {
            BOOL isExecWithDisplay = type & 0x01;
            [plugin addCommands:@{
                @"isSyncWithDisplay": isExecWithDisplay ? @YES : @NO,
                @"args": args,
            }];
        }
    }

    retDict = [self execCommandById:componentId type:type];
    return retDict;
}

@end

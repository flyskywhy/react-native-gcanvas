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

#import <Foundation/Foundation.h>
#import <GLKit/GLKit.h>
#import "GCVCommon.h"
#import "GCanvasModuleProtocol.h"
#import "GCanvasViewProtocol.h"
#import "GCanvasObject.h"

NS_ASSUME_NONNULL_BEGIN

typedef void (^GCanvasModuleCallback)(id result);


#define kGCanvasResetNotification       @"kGCanvasReset"
#define kGCanvasCompLoadedNotification  @"kGCanvasCompLoaded"
#define kGCanvasCompUnloadedNotification  @"kGCanvasCompUnloaded"
#define kGCanvasDestroyNotification     @"kGCanvasDestroy"


@interface GCanvasModule : NSObject

@property (nonatomic, weak, readonly) id<GCanvasModuleProtocol>deletage;
@property (nonatomic, weak) id<GCVImageLoaderProtocol>imageLoader;

@property (nonatomic, strong, readonly) NSMutableDictionary *gcanvasObjectDict;

- (instancetype)init __attribute__((unavailable("unavailable, use initWithDelegate instead")));
- (instancetype)initWithDelegate:(nonnull id<GCanvasModuleProtocol>)delegate;

- (dispatch_queue_t)gcanvasExecuteQueue;

/**
 * Export JS method for initialize GCanvas Module, a synchronize method
 *
 * @param   args        input arguments
 *
 * @return              enable success return "true", or return "false"
 */
- (NSString*)enable:(NSDictionary *)args;

- (void)disable:(NSString*)componentId;

#pragma mark - Export Method of Context2D
/**
 * Export JS method for reset GCanvas component while disappear
 * [iOS only]
 *
 * @param   componentId GCanvas component identifier
 */
- (void)resetComponent:(NSString*)componentId;

/**
 * Export JS method for preloading image
 *
 * @param   data        NSArray, contain 2 item
 *          data[0]     image source,
 *          data[1]     fake texture id(auto-increment id)of GCanvasImage in JS
 * @param   callback    GCanvasModuleCallback callback
 */
- (void)preLoadImage:(NSArray *)data callback:(GCanvasModuleCallback)callback;

- (void)drawCanvas2Canvas:(NSDictionary*)dict;

/**
 * Export JS method for binding image to real native texture
 *
 * @param   data        NSArray, contain 2 item
 *          data[0]     image source,
 *          data[1]     fake texture id(auto-increment id)of GCanvasImage in JS
 * @param   componentId GCanvas component identifier
 * @param   callback    GCanvasModuleCallback callback
 */
- (void)bindImageTexture:(NSArray *)data componentId:(NSString*)componentId callback:(GCanvasModuleCallback)callback;

/**
 * Export JS method  set GCanvas plugin contextType
 * @param   type    see GCVContextType
 */
- (void)setContextType:(NSUInteger)type componentId:(NSString*)componentId;

- (void)setDevicePixelRatio:(NSString*)componentId ratio:(CGFloat)ratio;

- (void)resetGlViewport:(NSString*)componentId;

- (NSString*)toDataURL:(NSString*)componentId mimeType:(NSString*)mimeType quality:(CGFloat)quality;

/**
 * Export JS method  set log level
 * @param   level  loglevel 0-debug,1-info,2-warn,3-error
 */
- (void)setLogLevel:(NSUInteger)level;

#pragma mark - Export Async RN Method
/**
 * Export JS method for context 2d or webgl render
 *
 * @param   componentId GCanvas component identifier
 * @param   commands    render commands from js
 * @param   type        render type
 */
- (void)render:(NSString *)componentId commands:(NSString*)commands type:(NSUInteger)type;

#pragma mark - Export Sync RN Method
/**
 * JS call native directly for 2d or webgl, a synchronize method
 *
 * @param   dict    input command
 *          dict[@"contextId"] - GCanvas component identifier
 *          dict[@"type"] - type
 *          dict[@"args"] - command
 *
 * @return          return execute result
 */
- (NSDictionary*)extendCallNative:(NSDictionary*)dict;

NS_ASSUME_NONNULL_END

@end

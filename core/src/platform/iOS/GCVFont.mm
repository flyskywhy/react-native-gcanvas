/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */

#import "GCVFont.h"

#include <malloc/malloc.h>
#include <unordered_map>

#include "GFontStyle.h"
#include "GCanvas2dContext.h"

#define GCV_FONT_TEXTURE_SIZE 1024
#define GCV_FONT_GLYPH_PADDING 0
#define EMOJI_FONT @"Apple Color Emoji"

#pragma mark - GFontLayout
@implementation GFontLayout

@end

#pragma mark - GCVFontGlayphTexture
@interface GCVFontGlayphTexture : NSObject

@property(nonatomic, assign) short width;
@property(nonatomic, assign) short height;
@property(nonatomic, assign) GLuint textureId;

@end

@implementation GCVFontGlayphTexture

@end

#pragma mark - GCVFont
@interface GCVFont()
{
    // Font preferences
    float pointSize, ascent, descent, contentScale, glyphPadding, xHeight,capHeight;
    float lineWidth;
    
    CGGlyph *glyphsBuffer;
    CGPoint *positionsBuffer;
    std::unordered_map<int, GFontGlyphInfo> glyphInfoMap;//作为成员变量，是防止数据提前析构
    
    //font cache
    NSMutableDictionary *fontCache;
    
    NSString *curFontName;
}

@property (nonatomic, assign) BOOL isStroke;
@property (nonatomic, assign) CTFontRef ctMainFont;

@end

@implementation GCVFont
{
    NSString            *_key;
}

@synthesize context;
@synthesize glyphCache;
@synthesize treemap;

static NSMutableDictionary *staticFontInstaceDict;
+ (NSMutableDictionary*)staticFontInstaceDict{
    static NSMutableDictionary *fontInstanceDict;
    if( !fontInstanceDict ){
        fontInstanceDict = NSMutableDictionary.dictionary;
    }
    return fontInstanceDict;
}

+ (instancetype)createGCFontWithKey:(NSString*)key
{
    GCVFont *gcvFont = [[GCVFont alloc] initWithKey:key];
    self.staticFontInstaceDict[key] = gcvFont;
    return gcvFont;
}

+ (GCVFont *)getGCVFontWithKey:(NSString*)key
{
    return self.staticFontInstaceDict[key];
}

+ (void)removeGCVFontWithKey:(NSString*)key
{
    return [self.staticFontInstaceDict removeObjectForKey:key];
}

- (instancetype)initWithKey:(NSString *)key
{
    if (self = [super init]) {
        _key = key;
        fontCache = NSMutableDictionary.dictionary;
    }
    return self;
}

- (void)dealloc
{
    if (self.ctMainFont) {
        CFRelease(self.ctMainFont);
    }
    fontCache = nil;
}

- (void)cleanFont
{
    @synchronized(self){
        [GCVFont removeGCVFontWithKey:_key];
        [fontCache removeAllObjects];
    }
}

- (BOOL)isFamilySupportBold:(NSString *)family
{
    NSMutableDictionary *attrstmp = [NSMutableDictionary dictionary];
    attrstmp[(NSString *)kCTFontFamilyNameAttribute] = family;
    attrstmp[(NSString *)kCTFontSizeAttribute] = @(10);
    
    CTFontSymbolicTraits symbolicTraitstmp = 0;
    symbolicTraitstmp |= kCTFontBoldTrait;
    NSDictionary *traitstmp = @{(NSString *)kCTFontSymbolicTrait:@(symbolicTraitstmp)};
    attrstmp[(NSString*)kCTFontTraitsAttribute] = traitstmp;
    
    CTFontDescriptorRef fontDesctmp =CTFontDescriptorCreateWithAttributes((CFDictionaryRef)attrstmp);
    CTFontRef fonttmp = CTFontCreateWithFontDescriptor(fontDesctmp, 0, NULL);
    if (fontDesctmp){
        CFRelease(fontDesctmp);
    }
    
    CTFontSymbolicTraits traits_tmp = CTFontGetSymbolicTraits(fonttmp);
    BOOL isBoldtmp = ((traits_tmp & kCTFontBoldTrait) == kCTFontBoldTrait);
    CFRelease(fonttmp);
    return isBoldtmp;
}

- (CTFontRef)createFontFromStyle:(gcanvas::GFontStyle *)fontStyle
{
    NSString *family = [NSString stringWithUTF8String:fontStyle->GetFamily().c_str()];
    // 这段逻辑主要是对不支持字体加粗的默认走Arial字体
    if (fontStyle->GetWeight() == gcanvas::GFontStyle::Weight::BOLD) {
        BOOL isBoldtmp = [self isFamilySupportBold:family];
        if (!isBoldtmp) {
            family = @"Arial";
        }
    }
 
    NSMutableDictionary *attrs = [NSMutableDictionary dictionary];
    // family
    attrs[(NSString *)kCTFontFamilyNameAttribute] = family;
    // size
    attrs[(NSString *)kCTFontSizeAttribute] = @(fontStyle->GetSize());
    // symbolicTraits
    CTFontSymbolicTraits symbolicTraits = 0;
    if (fontStyle->GetWeight() == gcanvas::GFontStyle::Weight::BOLD)
    {
        symbolicTraits |= kCTFontBoldTrait;
    }
    BOOL isItalic = NO;
    if (fontStyle->GetStyle()==gcanvas::GFontStyle::Style::ITALIC)
    {
        isItalic = YES;
        symbolicTraits |= kCTFontItalicTrait;
    }
    if (symbolicTraits)
    {
        NSDictionary *traits = @{(NSString *)kCTFontSymbolicTrait:@(symbolicTraits)};
        attrs[(NSString*)kCTFontTraitsAttribute] = traits;
    }
    
    CTFontDescriptorRef fontDesc = CTFontDescriptorCreateWithAttributes((CFDictionaryRef)attrs);
    
    CGAffineTransform matrix = CGAffineTransformIdentity;
    matrix.a = context->mCurrentState->mscaleFontX;
    matrix.d = context->mCurrentState->mscaleFontY;
    if (isItalic)
    {
        matrix.c = tan(15*M_PI/180);  //这里有个bug，当有缩放时，会影响倾斜角度。
    }
    
    CTFontRef curFont = CTFontCreateWithFontDescriptor(fontDesc, 0, &matrix);
    
    if (fontDesc)
    {
        CFRelease(fontDesc);
    }
    
    return curFont;
}

- (void)resetWithFontStyle:(gcanvas::GFontStyle *)fontStyle isStroke:(BOOL)isStroke
{
    self.isStroke = isStroke;
    contentScale = 1;
    lineWidth = context->LineWidth() * context->mDevicePixelRatio;
    
    glyphPadding = GCV_FONT_GLYPH_PADDING + (isStroke ? lineWidth : 0);
    
    const std::string& name = fontStyle->GetName();
    curFontName = [NSString stringWithUTF8String:name.c_str()];
    CTFontRef fontRef = (__bridge CTFontRef)([fontCache objectForKey:curFontName]);
    if (!fontRef) {
        fontRef = [self createFontFromStyle:fontStyle];
        if (fontRef) {
            [fontCache setObject:(__bridge id)fontRef forKey:curFontName];
        }
    }
    
    if (fontRef) {
        self.ctMainFont = fontRef;
        pointSize = fontStyle->GetSize();
        ascent = CTFontGetAscent(self.ctMainFont) / context->mCurrentState->mscaleFontY; // 基线到最顶
        descent = CTFontGetDescent(self.ctMainFont) / context->mCurrentState->mscaleFontY; // 基线到最低
        xHeight = CTFontGetXHeight(self.ctMainFont) / context->mCurrentState->mscaleFontY; // 小写字母高度,x为参考
        capHeight = CTFontGetCapHeight(self.ctMainFont) / context->mCurrentState->mscaleFontY; //大写字母高度,C为参考
    }
}

- (GFontLayout *)getLayoutForString:(const unsigned int *)ucs ucsLength:(unsigned int)ucsLength withFontStyle:(NSString *)fontStyle
{
    GTextMetrics metrics = {
        .width = 0,
        .ascent = 0,
        .descent = 0,
    };
    NSMutableData *layoutData = [NSMutableData dataWithCapacity:ucsLength];

    GFontLayout *fontLayout = [[GFontLayout alloc] init];
    fontLayout.glyphLayout = layoutData;
    fontLayout.glyphCount = 0;
  
    float offsetX = 0;
    for (int i = 0; i < ucsLength; i++) {
        bool isPixelModeRgba = isCharcodeEmoji(ucs, ucsLength, i);
        [self getGlyphForChar:ucs[i] isPixelModeRgba:isPixelModeRgba withFontStyle:isPixelModeRgba ? EMOJI_FONT : fontStyle withFontLayout:fontLayout withOffsetX:&offsetX];
        ++fontLayout.glyphCount;
    }
    
    metrics.width = offsetX / context->mCurrentState->mscaleFontX;  //2*glyphPadding; 不能加，否则单个字符绘制会空袭很大
    metrics.ascent = fontLayout.metrics.ascent / context->mCurrentState->mscaleFontY;
    metrics.descent = fontLayout.metrics.descent / context->mCurrentState->mscaleFontY;
    fontLayout.metrics = metrics;
    
    return fontLayout;
}

- (void)FillTextInternal:(NSString*)fontStyle charcode:(wchar_t)charcode offsetX:(float &)offsetX withPosition:(CGPoint)destPoint
{
    const GGlyph *pGlyph = glyphCache->GetGlyph([fontStyle UTF8String], charcode, fontStyle.UTF8String, self.isStroke);
    if (pGlyph) {
        GFontGlyphLayout gl;

        gl.info = *pGlyph;
        gl.xpos = offsetX;

        // ref to DrawText() in core/src/platform/Android/GFont.cpp
        if (charcode != UCS4_COMBINING_ENCLOSING_KEYCAP) {
            offsetX += gl.info.advanceX / context->mCurrentState->mscaleFontX;
        }

        GLuint textureId = InvalidateTextureId;
        if (gl.info.texture != NULL) {
            textureId = gl.info.texture->GetTextureID();
        }

        GGlyph &glyphInfo = gl.info;
        float x0 = (float) (destPoint.x + gl.xpos + glyphInfo.offsetX / context->mCurrentState->mscaleFontX);
        float y0 = (float) (destPoint.y - (glyphInfo.height / context->mCurrentState->mscaleFontY + glyphInfo.offsetY / context->mCurrentState->mscaleFontY));
        float w = glyphInfo.width / context->mCurrentState->mscaleFontX;
        float h = glyphInfo.height / context->mCurrentState->mscaleFontY;
        float s0 = glyphInfo.s0;
        float t0 = glyphInfo.t0;
        float s1 = glyphInfo.s1;
        float t1 = glyphInfo.t1;

        // ref to drawGlyph() in core/src/platform/Android/GFont.cpp
        if (glyphInfo.isPixelModeRgba)
        {
            int fontTextureWidth = treemap->GetWidth();
            int fontTextureHeight = treemap->GetHeight();
            context->Save();
            context->DrawImage(textureId, fontTextureWidth, fontTextureHeight,
                               s0 * fontTextureWidth, t1 * fontTextureHeight,
                               (s1 - s0) * fontTextureWidth, (t0 - t1) * fontTextureHeight,
                               x0, y0, w, h);
            context->Restore();
        } else {
            GColorRGBA color = self.isStroke ? BlendStrokeColor(context) : BlendFillColor(context);
            context->SetTexture(textureId);
            context->PushRectangle(x0, y0, w, h, s0, t1, s1 - s0, t0 - t1, color);
       }
    }
}

- (void)drawString:(const unsigned int *)ucs
         ucsLength:(unsigned int)ucsLength
     withFontStyle:(NSString*)fontStyle
        withLayout:(GFontLayout*)fontLayout
      withPosition:(CGPoint)destPoint
{
    float offsetX = 0;
    for (int i = 0; i < ucsLength; i++) {
        if (i < ucsLength - 2 && ucs[i + 2] == UCS4_COMBINING_ENCLOSING_KEYCAP) {
            // ref to (U+0031 U+FE0F U+20E3) in https://projects.iamcal.com/emoji-data/table.htm
            [self FillTextInternal:EMOJI_FONT charcode:ucs[i + 2] offsetX:offsetX withPosition:destPoint];
            [self FillTextInternal:EMOJI_FONT charcode:ucs[i] offsetX:offsetX withPosition:destPoint];
            i += 2;
        } else {
            [self FillTextInternal:isCharcodeEmoji(ucs, ucsLength, i) ? EMOJI_FONT : fontStyle charcode:ucs[i] offsetX:offsetX withPosition:destPoint];
        }
    }
}

- (void)getGlyphForChar:(wchar_t)c
        isPixelModeRgba:(bool)isPixelModeRgba
          withFontStyle:(NSString *)fontStyle
         withFontLayout:(GFontLayout *)fontLayout
            withOffsetX:(float *)offsetX
{
    GTextMetrics metrics = fontLayout.metrics;
    NSMutableData *layoutData = fontLayout.glyphLayout;
    const GGlyph *pGlyph = glyphCache->GetGlyph([fontStyle UTF8String], c, [fontStyle UTF8String], self.isStroke);
    
    if (pGlyph) {
        GFontGlyphLayout gl;
        
        gl.info = *pGlyph;
        gl.xpos = *offsetX;
        if (c == UCS4_EMOJI_SELECTOR ||
            c == UCS4_TEXT_SELECTOR ||
            c == UCS4_ZERO_WIDTH_JOINER ||
            c == UCS4_COMBINING_ENCLOSING_KEYCAP
        ) {} else {
            *offsetX += gl.info.advanceX;
        }
        metrics.ascent = MAX(metrics.ascent, gl.info.height + gl.info.offsetY - glyphPadding);
        metrics.descent = MAX(metrics.descent, -gl.info.offsetY - glyphPadding);
        
        NSData *data = [NSData dataWithBytes:&gl length:sizeof(gl)];
        [layoutData appendData:data];
        fontLayout.metrics = metrics;
        return ;
    }
    
    GCVFont *curFont = self;
    
    NSString *nsString =[[NSString alloc] initWithBytes:&c length:sizeof(c) encoding:NSUTF32LittleEndianStringEncoding];
    if (!nsString) {
        return;
    }
    // Create attributed line
    NSAttributedString *attributes = [[NSAttributedString alloc]
                                      initWithString:nsString
                                      attributes:@{ (id)kCTFontAttributeName: (__bridge id)curFont.ctMainFont }];
    
    CTLineRef line = CTLineCreateWithAttributedString((CFAttributedStringRef)attributes);
    CFArrayRef runs = CTLineGetGlyphRuns(line);
    NSInteger runCount = CFArrayGetCount(runs);
    
    int layoutIndex = 0;
    for (int i = 0; i < runCount; i++) {
        CTRunRef run = (CTRunRef)CFArrayGetValueAtIndex(runs, i);
        NSInteger runGlyphCount = CTRunGetGlyphCount(run);
        CTFontRef runFont = (CTFontRef)CFDictionaryGetValue(CTRunGetAttributes(run), kCTFontAttributeName);
        // Fetch glyphs buffer
        const CGGlyph *glyphs = CTRunGetGlyphsPtr(run);
        if (!glyphs) {
            size_t glyphsBufferSize = sizeof(CGGlyph) * runGlyphCount;
            if (malloc_size(glyphsBuffer) < glyphsBufferSize) {
                glyphsBuffer = (CGGlyph *)realloc(glyphsBuffer, glyphsBufferSize);
            }
            CTRunGetGlyphs(run, CFRangeMake(0, 0), glyphsBuffer);
            glyphs = glyphsBuffer;
        }
        // Fetch Positions buffer
        CGPoint *positions = (CGPoint *)CTRunGetPositionsPtr(run);
        if (!positions) {
            size_t positionsBufferSize = sizeof(CGPoint) * runGlyphCount;
            if (malloc_size(positionsBuffer) < positionsBufferSize) {
                positionsBuffer = (CGPoint *)realloc(positionsBuffer, positionsBufferSize);
            }
            CTRunGetPositions(run, CFRangeMake(0, 0), positionsBuffer);
            positions = positionsBuffer;
        }
        
        // Go through all glyphs for this run, create the textures and collect the glyph
        // info and positions as well as the max ascent and descent
        for (int g = 0; g < runGlyphCount; g++) {
            GFontGlyphLayout gl;

            CGGlyph glyph = glyphs[g];
            gl.info.charcode = c;
            gl.info.isPixelModeRgba = isPixelModeRgba;
            gl.xpos = positions[g].x + *offsetX;
            // NSLog(@"charcode: %x font: %@", c, fontStyle);
            [curFont createGlyph:glyph withFont:runFont withFontStyle:fontStyle glyphInfo:&gl.info];
            if (c == UCS4_EMOJI_SELECTOR ||
                c == UCS4_TEXT_SELECTOR ||
                c == UCS4_ZERO_WIDTH_JOINER ||
                c == UCS4_COMBINING_ENCLOSING_KEYCAP
            ) {} else {
                *offsetX += gl.info.advanceX;
            }
            metrics.ascent = MAX(metrics.ascent, gl.info.height + gl.info.offsetY - glyphPadding);
            metrics.descent = MAX(metrics.descent, -gl.info.offsetY - glyphPadding);
            layoutIndex++;
            
            NSData *data = [NSData dataWithBytes:&gl length:sizeof(gl)];
            [layoutData appendData:data];
        }
    }
    // Create the layout object and add it to the cache
    fontLayout.metrics = metrics;
    
    CFRelease(line);
}

// ref to LoadGlyph() in core/src/platform/Android/GFont.cpp
- (void)LoadGlyph:(int)ftBitmapWidth
   ftBitmapHeight:(int)ftBitmapHeight
     bitmapBuffer:(unsigned char *)bitmapBuffer
    withFontStyle:(NSString *)fontStyle
        glyphInfo:(GGlyph *)glyph
{
    GTexture *texture = context->GetFontTexture(glyph->isPixelModeRgba);

    GRect rect;
    GSize size(ftBitmapWidth, ftBitmapHeight);
    bool failed = true;
    while (failed)
    {
        failed = !treemap->Add(size, rect);
        if (failed)
        {
            context->SendVertexBufferToGPU();
            treemap->Clear();
            glyphCache->ClearGlyphsTexture();
        }
        else
        {
            texture->UpdateTexture(bitmapBuffer, rect.x, rect.y, rect.width, rect.height);
            glyph->texture = texture;
            unsigned int bitmapBufferLength = ftBitmapWidth * ftBitmapHeight;
            if (glyph->isPixelModeRgba) {
                bitmapBufferLength *= 4;
            }
            glyph->bitmapBuffer = new unsigned char[bitmapBufferLength];
            memcpy(glyph->bitmapBuffer, bitmapBuffer, bitmapBufferLength);
            glyph->width = ftBitmapWidth;
            glyph->height = ftBitmapHeight;
            glyph->outlineType = 0;
            glyph->outlineThickness = 0;
            glyph->s0 = (float) rect.x / treemap->GetWidth();
            glyph->t0 = (float) rect.y / treemap->GetHeight();
            glyph->s1 = (float) (rect.x + rect.width) / treemap->GetWidth();
            glyph->t1 = (float) (rect.y + rect.height) / treemap->GetHeight();

            glyphCache->Insert([fontStyle UTF8String], glyph->charcode, [fontStyle UTF8String], self.isStroke, *glyph);
        }

    }

}

- (void)createGlyph:(CGGlyph)glyph withFont:(CTFontRef)font withFontStyle:(NSString *)fontStyle glyphInfo:(GGlyph *)glyphInfo
{
    bool isPixelModeRgba = glyphInfo->isPixelModeRgba;

    CGRect bbRect;
    CTFontGetBoundingRectsForGlyphs(font, kCTFontOrientationDefault, &glyph, &bbRect, 1);
    CGSize advance;
    CTFontGetAdvancesForGlyphs(font, kCTFontOrientationDefault, &glyph, &advance, 1);
    glyphInfo->advanceX = advance.width;
    glyphInfo->advanceY = advance.height;
    
    // Add some padding around the glyphs
    glyphInfo->offsetY = floorf(bbRect.origin.y) - glyphPadding;
    glyphInfo->offsetX = floorf(bbRect.origin.x) - glyphPadding;
    glyphInfo->width = bbRect.size.width + glyphPadding * 2;
    glyphInfo->height = bbRect.size.height + glyphPadding * 2;
    
    // number e.g. 0 in 0️⃣ of Apple Color Emoji font need padding 2 not 1,
    // otherwise the top row pixels of the number will missing, but if use 2,
    // the bitmap is so big so that all emoji is cut many bottom row pixels
    // with react-native-runescape-text , so still use 1
    int padding = isPixelModeRgba ? 1 : 1;
    // Size needed for this glyph in pixels; must be a multiple of 8 for CG
    int pxWidth = floorf((glyphInfo->width * contentScale) / 8 + padding) * 8;
    int pxHeight = floorf((glyphInfo->height * contentScale) / 8 + padding) * 8;
    
    NSMutableData *pixels = [NSMutableData dataWithLength:pxWidth * pxHeight * (isPixelModeRgba ? 4 : 1)];
    CGColorSpaceRef colorSpace = isPixelModeRgba ? CGColorSpaceCreateDeviceRGB() : NULL;
    CGContextRef context = CGBitmapContextCreate(pixels.mutableBytes, pxWidth, pxHeight, 8, pxWidth * (isPixelModeRgba ? 4 : 1), colorSpace, isPixelModeRgba ? kCGImageAlphaPremultipliedLast : kCGImageAlphaOnly);
    if (colorSpace) {
        CFRelease(colorSpace);
    }
    
    CGContextSetFontSize(context, pointSize);
    CGContextTranslateCTM(context, 0.0, pxHeight);
    CGContextScaleCTM(context, contentScale, -1.0 * contentScale);
    
    // Fill or stroke?
    if (!self.isStroke) {
        CGContextSetTextDrawingMode(context, kCGTextFill);
        if (isPixelModeRgba) {
            CGContextSetRGBFillColor(context, 1.0, 1.0, 1.0, 1.0);
        } else {
            CGContextSetGrayFillColor(context, 1.0, 1.0);
        }
    } else {
        CGContextSetTextDrawingMode(context, kCGTextStroke);
        CGContextSetGrayStrokeColor(context, 1.0, 1.0);
        CGContextSetLineWidth(context, lineWidth);
    }
    
    // Render glyph and update the texture
    CGPoint p = CGPointMake(-glyphInfo->offsetX, -glyphInfo->offsetY);
    CTFontDrawGlyphs(font, &glyph, &p, 1, context);
    
    glyphInfo->width = pxWidth;
    glyphInfo->height = pxHeight;
    glyphInfo->texture = nullptr;
    [self LoadGlyph:pxWidth ftBitmapHeight:pxHeight bitmapBuffer:(unsigned char *)(pixels.bytes) withFontStyle:fontStyle glyphInfo:glyphInfo];
    
    CGContextRelease(context);
}

- (CGPoint)adjustTextPenPoint:(CGPoint)srcPoint
                   textAlign:(GTextAlign)textAlign
                    baseLine:(GTextBaseline)baseLine
                     metrics:(GTextMetrics)metrics
{
    switch (textAlign) {
        case GTextAlign::TEXT_ALIGN_START:
        case GTextAlign::TEXT_ALIGN_LEFT:
            break;
        case GTextAlign::TEXT_ALIGN_CENTER:
            srcPoint.x -= metrics.width/2.0f;
            break;
        case GTextAlign::TEXT_ALIGN_END:
        case GTextAlign::TEXT_ALIGN_RIGHT:
            srcPoint.x -= metrics.width;
            break;
    }
    
    switch( baseLine ) {
        case GTextBaseline::TEXT_BASELINE_ALPHABETIC:
        case GTextBaseline::TEXT_BASELINE_IDEOGRAPHIC:
            break;
        case GTextBaseline::TEXT_BASELINE_TOP:
        case GTextBaseline::TEXT_BASELINE_HANGING:
            srcPoint.y += ascent;
            break;
        case GTextBaseline::TEXT_BASELINE_MIDDLE:
            srcPoint.y += capHeight/2;
            break;
        case GTextBaseline::TEXT_BASELINE_BOTTOM:
            srcPoint.y -= descent;
            break;
    }
    
    return srcPoint;
}

@end

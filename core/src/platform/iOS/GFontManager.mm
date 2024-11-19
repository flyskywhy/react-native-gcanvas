/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */
#include "../../gcanvas/GFontManager.h"
#include "../../gcanvas/GCanvas2dContext.h"
#include "../../support/CharacterSet.h"
#include "../../support/Log.h"
#include "../../GCanvas.hpp"
#import "GCVFont.h"

#include <assert.h>



extern void iOS_GCanvas_Draw_Text(const unsigned int *text, unsigned int text_length, float x, float y, bool isStroke, GCanvasContext *context, void* fontContext);
extern float iOS_GCanvas_Measure_Text(const char *text, unsigned int text_length, GCanvasContext *context, void* fontContext);
float* iOS_GCanvas_Measure_TextExt(const char *text, unsigned int text_length, GCanvasContext *context, void* fontContext);


class GFontManagerImplement : public GFontManager
{
public:
    GFontManagerImplement(GCanvasContext *context);

    virtual ~GFontManagerImplement();

    void DrawText(const unsigned int *text,
                  unsigned int text_length, float x, float y,
                  bool isStroke, gcanvas::GFontStyle *fontStyle);
    
    float MeasureText(const char *text,
                    unsigned int text_length, gcanvas::GFontStyle *fontStyle);
    
    float* MeasureTextExt(const char *text,
                                  unsigned int text_length, gcanvas::GFontStyle *fontStyle);

};

GFontManager *GFontManager::NewInstance(GCanvasContext *context)
{
    return new GFontManagerImplement(context);
}


GFontManagerImplement::~GFontManagerImplement()
{
    mTreemap.Clear();
    mGlyphCache.ClearGlyphsTexture();
    
    // clear font
    NSString *key = [NSString stringWithFormat:@"%p", mContext];
    GCVFont *curFont = [GCVFont getGCVFontWithKey:key];
    [curFont cleanFont];
}

GFontManagerImplement::GFontManagerImplement(GCanvasContext *context) : GFontManager(context)
{
    NSString *key = [NSString stringWithFormat:@"%p", context];
    GCVFont *curFont = [GCVFont createGCFontWithKey:key];

    [curFont setContext: context];
    [curFont setGlyphCache: &mGlyphCache];
    [curFont setTreemap: &mTreemap];
}

void GFontManagerImplement::DrawText(const unsigned int *text,
                                     unsigned int text_length, float x, float y,
                                     bool isStroke, gcanvas::GFontStyle *fontStyle)
{
    if (text == nullptr || text_length == 0)
    {
        return;
    }

    NSString *key = [NSString stringWithFormat:@"%p", mContext];
    GCVFont *curFont = [GCVFont getGCVFontWithKey:key];
    iOS_GCanvas_Draw_Text(text, text_length, x, y, isStroke, mContext, (__bridge void*)curFont);
}

float GFontManagerImplement::MeasureText(const char *text,
                                       unsigned int textLength, gcanvas::GFontStyle *fontStyle)
{
    NSString *key = [NSString stringWithFormat:@"%p", mContext];
    GCVFont *curFont = [GCVFont getGCVFontWithKey:key];
    return iOS_GCanvas_Measure_Text(text,textLength,mContext, (__bridge void*)curFont);
}


float* GFontManagerImplement::MeasureTextExt(const char *text, unsigned int textLength, gcanvas::GFontStyle *fontStyle) {
    NSString *key = [NSString stringWithFormat:@"%p", mContext];
    GCVFont *curFont = [GCVFont getGCVFontWithKey:key];
    return iOS_GCanvas_Measure_TextExt(text,textLength,mContext, (__bridge void*)curFont);
}



#pragma mark - iOS implementation of Font & texImage
/**
 * Draw GCanvas2D Text with GCVFont.
 *
 * @param text          text string to draw
 * @param text_length   text length
 * @param x             draw position x
 * @param y             draw position y
 * @param isStroke      isStroke flag
 * @param context       see GCanvasContext
 *
 */
void iOS_GCanvas_Draw_Text(const unsigned int *ucs, unsigned int ucsLength, float x, float y, bool isStroke, GCanvasContext *context, void* fontContext){
    if (ucs == nullptr || ucsLength == 0 || context == nullptr || fontContext == nullptr) {
        return;
    }
    
    GCanvasState *current_state_ = context->GetCurrentState();
    GCVFont *curFont = (__bridge GCVFont*)fontContext;
    
    [curFont resetWithFontStyle:current_state_->mFont isStroke:isStroke];
    GFontLayout *fontLayout = [curFont getLayoutForString:ucs ucsLength:ucsLength withFontStyle:[NSString stringWithUTF8String:current_state_->mFont->GetName().c_str()]];
    CGPoint destPoint = [curFont adjustTextPenPoint:CGPointMake(x, y)
                                          textAlign:current_state_->mTextAlign
                                           baseLine:current_state_->mTextBaseline
                                            metrics:fontLayout.metrics];
    
    current_state_->mShader->SetOverideTextureColor(1);
    
    glActiveTexture(GL_TEXTURE0);
    
    [curFont drawString:ucs ucsLength:ucsLength withFontStyle:[NSString stringWithUTF8String:current_state_->mFont->GetName().c_str()] withLayout:fontLayout withPosition:destPoint];
    
    
}

float iOS_GCanvas_Measure_Text(const char *text, unsigned int text_length, GCanvasContext *context, void* fontContext){
    if (text == nullptr || text_length == 0 || context == nullptr || fontContext == nullptr) {
        return 0;
    }
    
    Utf8ToUCS4 *lbData = new Utf8ToUCS4(text, text_length);
    unsigned int *ucs = lbData->ucs4;
    unsigned int ucsLength = lbData->ucs4len;

   GCanvasState *current_state_ = context->GetCurrentState();
    GCVFont *curFont = (__bridge GCVFont*)fontContext;
    
    [curFont resetWithFontStyle:current_state_->mFont isStroke:false];
    GFontLayout *fontLayout = [curFont getLayoutForString:(const unsigned int *)ucs ucsLength:(unsigned int)ucsLength withFontStyle:[NSString stringWithUTF8String:current_state_->mFont->GetName().c_str()]];
    
    delete lbData;

    return fontLayout.metrics.width;
}


float* iOS_GCanvas_Measure_TextExt(const char *text, unsigned int text_length, GCanvasContext *context, void* fontContext){
    if (text == nullptr || text_length == 0 || context == nullptr || fontContext == nullptr) {
        float *ret = new float[4];
        ret[0] = ret[1] = ret[2] = ret[3] = 0;
        return ret;
    }
    
    Utf8ToUCS4 *lbData = new Utf8ToUCS4(text, text_length);
    unsigned int *ucs = lbData->ucs4;
    unsigned int ucsLength = lbData->ucs4len;

    GCanvasState *current_state_ = context->GetCurrentState();
    GCVFont *curFont = (__bridge GCVFont*)fontContext;
    
    [curFont resetWithFontStyle:current_state_->mFont isStroke:false];
    NSString *string = [[NSString alloc] initWithBytes:text length:text_length encoding:NSUTF8StringEncoding];
    GFontLayout *fontLayout = [curFont getLayoutForString:(const unsigned int *)ucs ucsLength:(unsigned int)ucsLength  withFontStyle:[NSString stringWithUTF8String:current_state_->mFont->GetName().c_str()]];
    
    delete lbData;

    float *ret = new float[4];
    ret[0] = fontLayout.metrics.width;
    ret[1] = fontLayout.metrics.ascent + fontLayout.metrics.descent;
    ret[2] = fontLayout.metrics.ascent;
    ret[3] = fontLayout.metrics.descent;
    return ret;
}

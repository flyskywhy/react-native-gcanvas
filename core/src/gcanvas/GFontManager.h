/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */
#ifndef GCANVAS_GFONTMANAGER_H
#define GCANVAS_GFONTMANAGER_H

#include "GPoint.h"
#include "GTexture.h"
#include "GGlyphCache.h"
#include "GTreemap.h"
#include <map>
#include <string>
#include <vector>


// ref to https://github.com/AndrewRyanChama/matrix-react-sdk/blob/fe674e894880967d2f7308beacf9caf9722df2cf/src/emoji.ts#L96
// U+FE0F (and U+FE0E) is just variation selector but not glyph
// ref to [Emoji Catalog](https://projects.iamcal.com/emoji-data/table.htm)
#define UCS4_EMOJI_SELECTOR 0xFE0F
#define UCS4_TEXT_SELECTOR 0xFE0E
#define UCS4_ZERO_WIDTH_JOINER 0x200D
#define UCS4_COMBINING_ENCLOSING_KEYCAP 0x20E3

class GCanvasContext;

#define FontTextureWidth        2048
#define FontTextureHeight       2048

namespace gcanvas
{
    class GFontStyle;
}


class GFontManager
{
public:

    static GFontManager *NewInstance(GCanvasContext *context);

    virtual  ~GFontManager() = default;


    virtual void DrawText(const unsigned int *ucs,
                          unsigned int ucsLength, float x, float y,
                          bool isStroke, gcanvas::GFontStyle *fontStyle)=0;

    virtual float MeasureText(const char *text,
                              unsigned int textLength, gcanvas::GFontStyle *fontStyle)=0;
    //measure ext
    virtual float* MeasureTextExt(const char *text,
                                  unsigned int textLength, gcanvas::GFontStyle *fontStyle)=0;
    //return float[4]，0：top，1：height，2：ascender，3：descender
    virtual float* PreMeasureTextHeight(const char *text,
                                  unsigned int textLength, gcanvas::GFontStyle *fontStyle) {
        float *ret = new float[4];
        return ret;
    }

protected:
    GFontManager(GCanvasContext *context) : mContext(context), mGlyphCache(context, *this),
                                            mTreemap(FontTextureWidth, FontTextureHeight) {};
public:
    GCanvasContext *mContext;
    GGlyphCache mGlyphCache;
    GTreemap mTreemap;
};

#endif /* GCANVAS_GFONTMANAGER_H */

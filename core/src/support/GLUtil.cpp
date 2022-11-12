/**
* Created by G-Canvas Open Source Team.
* Copyright (c) 2017, Alibaba, Inc. All rights reserved.
*
* This source code is licensed under the Apache Licence 2.0.
* For the full copyright and license information, please view
* the LICENSE file in the root directory of this source tree.
*/

#include "GLUtil.h"

namespace gcanvas {


//////////////////////////////////////////////////////////////////////////////
///   Pixels Sample
//////////////////////////////////////////////////////////////////////////////
    struct RGBA {
        RGBA &operator+=(int c) {
            r += c & 0xff;
            g += c >> 8 & 0xff;
            b += c >> 16 & 0xff;
            a += c >> 24 & 0xff;

            return *this;
        }

        operator uint32_t() {
            uint32_t c = 0;
            c += r & 0xff;
            c += g << 8 & 0xff00;
            c += b << 16 & 0xff0000;
            c += a << 24 & 0xff000000;

            return c;
        }

        uint16_t r = 0;
        uint16_t g = 0;
        uint16_t b = 0;
        uint16_t a = 0;
    };

    inline RGBA operator/(const RGBA &a, int b) {
        RGBA c;
        c.r = a.r / b;
        c.g = a.g / b;
        c.b = a.b / b;
        c.a = a.a / b;
        return c;
    }

    inline int GetPixel(int *pixels, int x, int y, int width, int height) {
        if (x < 0) {
            x = 0;
        }
        if (x > width - 1) {
            x = width - 1;
        }
        if (y < 0) {
            y = 0;
        }
        if (y > height - 1) {
            y = height - 1;
        }
        return pixels[y * width + x];
    }

    void PixelsSampler(int inWidth, int inHeight, int *inPixels, int outWidth, int outHeight,
                       int *outPixels, bool imageSmoothingEnabled) {
        if (outWidth == 1 && outHeight == 1) {
            // when GetImageData 1x1 , it means APP want color pick 1 pixel, so
            // it's better not `pixel / 9` below but just pick 1 pixel exactly
            // in PixelsSampler() after GCanvasContext::GetImageData(), and since
            // float x y from PanResponder event which be divided by devicePixelRatio
            // (so that can be float), is converted to int x y in GCanvasWeex::GetImageData(),
            // so the exact pixel is inPixels[left bottom] while considering flip Y
            int inY = 0;
            int revertY = (inHeight - 1) - inY; // bottom is (3 - 1) - 0 = 2
            int inX = 0; // left is 0
            outPixels[0] = GetPixel(inPixels, inX, revertY, inWidth, inHeight);
        } else {
            float scaleWidth = inWidth / outWidth;
            float offsetX = scaleWidth / 2;
            if (scaleWidth < 2) {
                // can't find an offsetX to PixelsSampler without a flaw for 1 < scaleWidth < 2 , so just 0
                offsetX = 0;
            }

            float scaleHeight = inHeight / outHeight;
            float offsetY = scaleHeight / 2;
            if (scaleHeight < 2) {
                offsetX = 0;
            }

            for (int y = 0; y < outHeight; ++y) {
                // here inHeight / outHeight is more accurate than scaleHeight for inY
                int inY = y * inHeight / outHeight + offsetY;
                int revertY = (inHeight - 1) - inY;
                for (int x = 0; x < outWidth; ++x) {
                    int inX = x * inWidth / outWidth + offsetX;
                    if (imageSmoothingEnabled) {
                        RGBA pixel;
                        pixel += GetPixel(inPixels, inX, revertY, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX - 1, revertY - 1, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX, revertY - 1, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX + 1, revertY - 1, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX - 1, revertY, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX + 1, revertY, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX - 1, revertY + 1, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX, revertY + 1, inWidth, inHeight);
                        pixel += GetPixel(inPixels, inX - 1, revertY + 1, inWidth, inHeight);
                        outPixels[y * outWidth + x] = pixel / 9;
                    } else {
                        outPixels[y * outWidth + x] = GetPixel(inPixels, inX, revertY, inWidth, inHeight);
                    }
                }
            }
        }
    }

//////////////////////////////////////////////////////////////////////////////
///   Pixels BindTexture
//////////////////////////////////////////////////////////////////////////////
    GLuint PixelsBindTexture(const unsigned char *rgbaData, GLint format, unsigned int width,
                             unsigned int height, bool imageSmoothingEnabled,
                             std::vector<GCanvasLog> *errVec) {
        if (nullptr == rgbaData)
            return (GLuint) - 1;

        GLenum glerror = 0;
        GLuint glID;
        glGenTextures(1, &glID);
        glerror = glGetError();
        if (glerror && errVec) {
            GCanvasLog log;
            fillLogInfo(log, "gen_texture_fail", "<function:%s, glGetError:%x>", __FUNCTION__,
                        glerror);
            errVec->push_back(log);
        }
        glBindTexture(GL_TEXTURE_2D, glID);
        glerror = glGetError();
        if (glerror && errVec) {
            GCanvasLog log;
            fillLogInfo(log, "bind_texture_fail", "<function:%s, glGetError:%x>", __FUNCTION__,
            glerror);
            errVec->push_back(log);
        }

        if (imageSmoothingEnabled) {
            glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
            glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        } else {
            glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
            glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        }

        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

        glTexImage2D(GL_TEXTURE_2D, 0, format, width, height, 0, format,
                     GL_UNSIGNED_BYTE, rgbaData);
        glerror = glGetError();
        if (glerror && errVec) {
            GCanvasLog log;
            fillLogInfo(log, "glTexImage2D_failglTexImage2D_fail", "<function:%s, glGetError:%x>",
            __FUNCTION__, glerror);
            errVec->push_back(log);
        }

        return glID;
    }

}

/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */

#ifndef __GCANVAS_CHARACTER_SET_H__
#define __GCANVAS_CHARACTER_SET_H__

#include <export.h>

struct Utf8ToUCS4
{
    const char *utf8;
    int utf8len;
    unsigned int *ucs4;
    int ucs4len;

    API_EXPORT Utf8ToUCS4(const char *utf8In, int utf8lenIn);
    virtual ~Utf8ToUCS4();

private:
    Utf8ToUCS4(const Utf8ToUCS4 &);
    void getUcs4();
};

#endif

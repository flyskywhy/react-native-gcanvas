/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */
#include "CharacterSet.h"
#include "support/Log.h"
#include <unicode/utf.h>

Utf8ToUCS4::Utf8ToUCS4(const Utf8ToUCS4 &utf8)
    : utf8(0), utf8len(0), ucs4(0), ucs4len(0)
{
}

Utf8ToUCS4::Utf8ToUCS4(const char *utf8In, int utf8lenIn)
    : utf8(utf8In), utf8len(utf8lenIn), ucs4(0), ucs4len(0)
{
    getUcs4();
}

Utf8ToUCS4::~Utf8ToUCS4()
{
    if (ucs4) delete[] ucs4;
}

void Utf8ToUCS4::getUcs4()
{
    ucs4 = new unsigned int[utf8len + 1];

    int offset = 0;
    unsigned ch;

    int i = 0;
    while (i < utf8len) {
        U8_NEXT(utf8, i, utf8len, ch);
        if (ch >= 0) {
            // LOG_D("[getCodePoint][%x]", ch);
            ucs4[offset++] = ch;
        }
    }

    ucs4len = offset;
}

/**
 * Created by G-Canvas Open Source Team.
 * Copyright (c) 2017, Alibaba, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache Licence 2.0.
 * For the full copyright and license information, please view
 * the LICENSE file in the root directory of this source tree.
 */
#include "WebGLProgram.h"

namespace NodeBinding
{
Napi::FunctionReference WebGLProgram::constructor;
WebGLProgram::WebGLProgram(const Napi::CallbackInfo &info) : Napi::ObjectWrap<WebGLProgram>(info)
{
    this->mId = info[0].As<Napi::Number>().Uint32Value();
}

void WebGLProgram::Init(Napi::Env env)
{
    Napi::HandleScope scope(env);

    Napi::Function func =
        DefineClass(env,
                    "WebGLShader",
                    {
    
                    });
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
}

Napi::Object WebGLProgram::NewInstance(Napi::Env env, const Napi::Value arg)
{
    Napi::Object obj = constructor.New({arg});
    return obj;
}
} // namespace NodeBinding
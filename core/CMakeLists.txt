# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++14 -fno-exceptions -fno-unwind-tables")

add_definitions(-DFT2_BUILD_LIBRARY)
add_definitions(-DANDROID)

if ((${ANDROID_ARM_NEON}) AND (${ANDROID_ABI} MATCHES arm*))
    add_definitions(-DARM_NEON_OPT)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -mfloat-abi=softfp -mfpu=neon")
endif ()


include_directories("./src/")
include_directories("./src/gcanvas")
include_directories("./src/support")
include_directories("./src/platform/Android")
include_directories("./android/")
include_directories("./android/png")
include_directories("./android/png/thirdparty")
include_directories("./android/memory")
include_directories("./android/3d")
include_directories("./android/3d/jsc")
include_directories("./android/3d/util")
include_directories("./android/3d/view")
include_directories("./android/freetype/include")


set(SRC_FILES
        #root srcs
        ./src/GCanvas.cpp
        ./src/GCanvasManager.cpp
        ./src/GCanvasWeex.cpp # todo remove

        # gcanvas srcs
        ./src/gcanvas/GCanvas2dContext.cpp
        ./src/gcanvas/GCanvasState.cpp
        ./src/gcanvas/GConvert.cpp
        ./src/gcanvas/GFontStyle.cpp
        ./src/gcanvas/GFrameBufferObject.cpp
        ./src/gcanvas/GGlyphCache.cpp
        ./src/gcanvas/GPath.cpp
        ./src/gcanvas/GShader.cpp
        ./src/gcanvas/GShaderManager.cpp
        ./src/gcanvas/GStrSeparator.cpp
        ./src/gcanvas/GTexture.cpp
        ./src/gcanvas/GTreemap.cpp
        ./src/gcanvas/GWebglContext.cpp

        # platform srcs
        ./src/platform/Android/GCanvas2DContextImpl.cpp

        ./src/platform/Android/GCanvas2DContextAndroid.cpp
        ./src/platform/Android/GCanvasAndroid.cpp
        ./src/platform/Android/GFont.cpp
        ./src/platform/Android/GFontCache.cpp
        ./src/platform/Android/GFontFamily.cpp
        ./src/platform/Android/GFontManagerAndroid.cpp
        ./src/platform/Android/GFontManagerImpl.cpp

        ./src/platform/Android/GFrameBufferObjectImpl.cpp

        ./src/platform/Android/GPreCompiledShaders.cpp
        ./src/platform/Android/GSystemFontInformation.cpp
        ./src/platform/Android/GFontManagerAndroid.cpp

        # support
        ./src/support/CharacterSet.cpp
        ./src/support/Encode.cpp
        ./src/support/FileUtils.cpp
        ./src/support/GLUtil.cpp
        ./src/support/Log.cpp
        ./src/support/Util.cpp
        ./src/support/Value.cpp )


if (GCANVAS_WEEX)
    add_definitions(-DGCANVAS_WEEX)
    file(GLOB android_root_src "./android/*.cpp")
    file(GLOB native_png_src "./android/png/*.cpp")
    file(GLOB native_png_thirdparty_src "./android/png/thirdparty/*.c")
    file(GLOB native_3d_src "./android/3d/*.cpp")
    file(GLOB native_3d_jsc_src "./android/3d/jsc/*.cpp")
    file(GLOB native_3d_util_src "./android/3d/util/*.cpp")
    file(GLOB native_3d_view_src "./android/3d/view/*.cpp")
    file(GLOB native_android_manager_src "./android/manager/*.cpp")
else()
    message(" not enter the gcanvas_weex >>>>>>>>>> ")
    list(APPEND SRC_FILES ./android/GCanvasJNI.cpp)
endif()


if (GCANVAS_RUNTIME)
    add_definitions(-DGCANVAS_RUNTIME)
endif()



add_library( # Sets the name of the library.
        gcanvas
        # Sets the library as a shared library.
        SHARED
        # Provides a relative path to your source file(s).
        ${native_png_src}
        ${native_png_thirdparty_src}
        ${native_3d_src}
        ${native_3d_jsc_src}
        ${native_3d_util_src}
        ${native_3d_view_src}
        ${android_root_src}
        ${native_android_manager_src}
        ${SRC_FILES} )


find_library( # Sets the name of the path variable.
        log-lib
        # Specifies the name of the NDK library that
        # you want CMake to locate.
        log)

# freetype v2.5 ~ v2.9.1
#set(FREETYPE_SRC_FILES
#        ./android/freetype/src/autofit/autofit.c
#        ./android/freetype/src/base/basepic.c
#        ./android/freetype/src/base/ftapi.c
#        ./android/freetype/src/base/ftbase.c
#        ./android/freetype/src/base/ftbbox.c
#        ./android/freetype/src/base/ftbitmap.c
#        ./android/freetype/src/base/ftdbgmem.c
#        ./android/freetype/src/base/ftdebug.c
#        ./android/freetype/src/base/ftglyph.c
#        ./android/freetype/src/base/ftinit.c
#        ./android/freetype/src/base/ftpic.c
#        ./android/freetype/src/base/ftstroke.c
#        ./android/freetype/src/base/ftsynth.c
#        ./android/freetype/src/base/ftsystem.c
#        ./android/freetype/src/bdf/bdf.c
#        ./android/freetype/src/cid/type1cid.c
#        ./android/freetype/src/cff/cff.c
#        ./android/freetype/src/gzip/ftgzip.c
#        ./android/freetype/src/lzw/ftlzw.c
#        ./android/freetype/src/pcf/pcf.c
#        ./android/freetype/src/pfr/pfr.c
#        ./android/freetype/src/psaux/psaux.c
#        ./android/freetype/src/pshinter/pshinter.c
#        ./android/freetype/src/psnames/psnames.c
#        ./android/freetype/src/raster/raster.c
#        ./android/freetype/src/sfnt/sfnt.c
#        ./android/freetype/src/smooth/smooth.c
#        ./android/freetype/src/truetype/truetype.c
#        ./android/freetype/src/type1/type1.c
#        ./android/freetype/src/type42/type42.c
#        ./android/freetype/src/winfonts/winfnt.c )

# freetype v2.12.0
#set(FREETYPE_SRC_FILES
#        ./android/freetype/src/autofit/autofit.c
#        ./android/freetype/src/base/ftbase.c
#        ./android/freetype/src/base/ftbbox.c
#        ./android/freetype/src/base/ftbitmap.c
#        ./android/freetype/src/base/ftdbgmem.c
#        ./android/freetype/src/base/ftdebug.c
#        ./android/freetype/src/base/ftglyph.c
#        ./android/freetype/src/base/ftinit.c
#        ./android/freetype/src/base/ftstroke.c
#        ./android/freetype/src/base/ftsynth.c
#        ./android/freetype/src/base/ftsystem.c
#        ./android/freetype/src/bdf/bdf.c
#        ./android/freetype/src/cid/type1cid.c
#        ./android/freetype/src/cff/cff.c
#        ./android/freetype/src/gzip/ftgzip.c
#        ./android/freetype/src/lzw/ftlzw.c
#        ./android/freetype/src/pcf/pcf.c
#        ./android/freetype/src/pfr/pfr.c
#        ./android/freetype/src/psaux/psaux.c
#        ./android/freetype/src/pshinter/pshinter.c
#        ./android/freetype/src/psnames/psnames.c
#        ./android/freetype/src/raster/raster.c
#        ./android/freetype/src/sdf/ftbsdf.c
#        ./android/freetype/src/sdf/ftsdf.c
#        ./android/freetype/src/sdf/ftsdfcommon.c
#        ./android/freetype/src/sdf/ftsdfrend.c
#        ./android/freetype/src/sfnt/sfnt.c
#        ./android/freetype/src/smooth/smooth.c
#        ./android/freetype/src/svg/svg.c
#        ./android/freetype/src/truetype/truetype.c
#        ./android/freetype/src/type1/type1.c
#        ./android/freetype/src/type42/type42.c
#        ./android/freetype/src/winfonts/winfnt.c )

# freetype v2.13.3
set(FREETYPE_SRC_FILES
        ./android/freetype/src/autofit/autofit.c
        ./android/freetype/src/base/ftbase.c
        ./android/freetype/src/base/ftbbox.c
        ./android/freetype/src/base/ftbitmap.c
        ./android/freetype/src/base/ftdbgmem.c
        ./android/freetype/src/base/ftdebug.c
        ./android/freetype/src/base/ftglyph.c
        ./android/freetype/src/base/ftinit.c
        ./android/freetype/src/base/ftmm.c
        ./android/freetype/src/base/ftstroke.c
        ./android/freetype/src/base/ftsynth.c
        ./android/freetype/src/base/ftsystem.c
        ./android/freetype/src/bdf/bdf.c
        ./android/freetype/src/cid/type1cid.c
        ./android/freetype/src/cff/cff.c
        ./android/freetype/src/gzip/ftgzip.c
        ./android/freetype/src/lzw/ftlzw.c
        ./android/freetype/src/pcf/pcf.c
        ./android/freetype/src/pfr/pfr.c
        ./android/freetype/src/psaux/psaux.c
        ./android/freetype/src/pshinter/pshinter.c
        ./android/freetype/src/psnames/psnames.c
        ./android/freetype/src/raster/raster.c
        ./android/freetype/src/sdf/ftbsdf.c
        ./android/freetype/src/sdf/ftsdf.c
        ./android/freetype/src/sdf/ftsdfcommon.c
        ./android/freetype/src/sdf/ftsdfrend.c
        ./android/freetype/src/sfnt/sfnt.c
        ./android/freetype/src/smooth/smooth.c
        ./android/freetype/src/svg/svg.c
        ./android/freetype/src/truetype/truetype.c
        ./android/freetype/src/type1/type1.c
        ./android/freetype/src/type42/type42.c
        ./android/freetype/src/winfonts/winfnt.c )

add_library(freetype SHARED ${FREETYPE_SRC_FILES})


# ref to [How to integrate libpng in my own project's CMakeLists.txt](https://github.com/pnggroup/libpng/issues/342#issuecomment-864589614)

# libpng configurable options

set(PNG_SHARED ON CACHE BOOL "" FORCE)
set(PNG_STATIC OFF CACHE BOOL "" FORCE)
set(PNG_EXECUTABLES OFF CACHE BOOL "" FORCE) # we only want lib
set(PNG_TESTS OFF CACHE BOOL "" FORCE) # we only want lib
set(SKIP_INSTALL_ALL OFF CACHE BOOL "" FORCE) # we only want lib

# add libpng

include_directories(./android/libpng)
# generated files from libpng during build
include_directories(${CMAKE_CURRENT_BINARY_DIR}/libpng)

add_subdirectory(./android/libpng)


target_link_libraries( # Specifies the target library.
        gcanvas
        GLESv1_CM
        GLESv2
        android
        EGL
        atomic
        jnigraphics
        freetype
        # Links the target library to the log library
        # included in the NDK.
        ${log-lib})


# here use ${log-lib} to support logcat with e.g. LOGD in freetype source code by
# add below #define code into ./android/freetype/include/freetype/internal/ftdebug.h
#
# #include <android/log.h>
# #define TAG "freetype"
# #define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG,TAG ,__VA_ARGS__)
# #define LOGI(...) __android_log_print(ANDROID_LOG_INFO,TAG ,__VA_ARGS__)
# #define LOGW(...) __android_log_print(ANDROID_LOG_WARN,TAG ,__VA_ARGS__)
# #define LOGE(...) __android_log_print(ANDROID_LOG_ERROR,TAG ,__VA_ARGS__)
# #define LOGF(...) __android_log_print(ANDROID_LOG_FATAL,TAG ,__VA_ARGS__)
#
target_link_libraries(
        freetype
        png
        ${log-lib})

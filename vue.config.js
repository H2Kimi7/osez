/**
 * Vue配置文件
 */
const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');

// 动态读取baseConfig.js中的SITE_CONFIG
const getSiteName = () => {
  try {
    const baseConfigContent = fs.readFileSync(path.resolve(__dirname, 'src/utils/baseConfig.js'), 'utf-8');
    const siteNameMatch = baseConfigContent.match(/siteName:\s*['"]([^'"]+)['"]/);
    return siteNameMatch ? siteNameMatch[1] : 'EZ THEME USER';
  } catch (err) {
    return 'EZ THEME USER';
  }
};

const siteName = getSiteName();

module.exports = defineConfig({
  // 部署应用包时的基本URL
  publicPath: './',
  
  // 输出目录
  outputDir: 'dist',
  
  // 静态资源目录
  assetsDir: 'static',
  
  // 是否使用eslint
  lintOnSave: process.env.NODE_ENV === 'development',
  
  // 生产环境是否生成sourceMap
  productionSourceMap: false,
  
  // 配置别名
  configureWebpack: config => {
    // 启用WebAssembly支持
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true
    };
    
    // 基本配置
    config.resolve = {
      ...config.resolve,
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    };
    
    // 配置WebAssembly文件处理
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.wasm$/,
          type: 'asset/resource',
          generator: {
            filename: 'static/modules/core/[name][ext]'
          }
        }
      ]
    };
    
    // 添加插件
    config.plugins.push(
      // 使用DefinePlugin定义全局变量
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
      })
    );
    
    // 忽略 Sass 弃用警告
    config.ignoreWarnings = [
      {
        module: /sass-loader/,
        message: /The legacy JS API is deprecated/
      }
    ];
    
    // 仅在生产环境下应用代码混淆
    if (process.env.NODE_ENV === 'production') {
      const obfuscateOptions = {
        compact: true,                       // 移除换行与多余空格，生成最小体积代码
        controlFlowFlattening: false,        // 关闭控制流扁平化以减小体积
        controlFlowFlatteningThreshold: 0,   // 控制流扁平化关闭
        deadCodeInjection: false,            // 注入死代码增大体积，关闭以保持性能
        debugProtection: false,              // 关闭调试防护以减小体积
        debugProtectionInterval: 0,          // 禁用循环检测
        disableConsoleOutput: true,          // 禁止控制台输出
        identifierNamesGenerator: 'hexadecimal', // 变量/函数名混淆风格 (hexadecimal更短)
        log: false,                          // 关闭 obfuscator 自身日志输出
        numbersToExpressions: false,         // 不将数字转换为复杂表达式
        renameGlobals: false,                // 不重命名全局变量以避免冲突和增加体积
        selfDefending: false,                // 关闭自我防护以减小体积
        simplify: true,                      // 启用代码简化
        splitStrings: false,                 // 关闭字符串拆分以减小体积
        splitStringsChunkLength: 0,          // 关闭字符串拆分
        stringArray: true,                   // 保留字符串数组混淆
        stringArrayCallsTransform: true,     // 保留字符串数组调用变换
        stringArrayEncoding: ['rc4'],          // 使用 RC4 编码，输出仅 ASCII
        stringArrayThreshold: 0.5,           // 提高阈值，减少进入数组的字符串数量
        transformObjectKeys: false,          // 不转换对象键名
        unicodeEscapeSequence: false         // 关闭Unicode转义以减小体积
      };

      // 排除第三方依赖文件，防止对大型库（vue、axios 等）混淆造成递归错误
      const excludePatterns = [
        '**/chunk-vendors*.js',  // 第三方依赖打包文件
        '**/runtime*.js',        // webpack runtime
      ];

      config.plugins.push(new WebpackObfuscator(obfuscateOptions, excludePatterns));
    }
  },
  
  // CSS配置
  css: {
    loaderOptions: {
      sass: {
        implementation: require('sass'),
        sassOptions: {
          outputStyle: 'expanded',
          fiber: false,
          indentedSyntax: false,
          includePaths: ['node_modules']
        },
        additionalData: `
          @use "@/assets/styles/base/variables.scss" as *;
        `
      }
    }
  },
  
  // 多页面配置
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: siteName
    }
  },

  devServer: {
    client: {
      overlay: false
    }
  }
}); 
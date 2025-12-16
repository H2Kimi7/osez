/**
 * 国际化配置
 */
import { createI18n } from 'vue-i18n';
import { SITE_CONFIG, DEFAULT_CONFIG } from '@/utils/baseConfig';
import { checkLoginStatus } from '@/api/auth';

// 注入应用名称到语言包
const injectSiteName = (messages) => {
  Object.keys(messages).forEach(locale => {
    if (messages[locale]?.common) {
      messages[locale].common.appName = SITE_CONFIG.siteName;
      if (messages[locale].common.welcome && messages[locale].common.welcome.includes('V2Board Admin')) {
        messages[locale].common.welcome = messages[locale].common.welcome.replace('V2Board Admin', SITE_CONFIG.siteName);
      }
    }
  });
  return messages;
};

// 获取浏览器语言
const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  // 首先检查完全匹配
  if (browserLang === 'zh-CN') return 'zh-CN';
  if (browserLang === 'zh-TW' || browserLang === 'zh-HK') return 'zh-TW';
  if (browserLang === 'ja' || browserLang === 'ja-JP') return 'ja-JP';
  if (browserLang === 'ko' || browserLang === 'ko-KR') return 'ko-KR';
  if (browserLang === 'ru' || browserLang === 'ru-RU') return 'ru-RU';
  if (browserLang === 'fa' || browserLang === 'fa-IR') return 'fa-IR';
  
  // 然后检查前缀匹配
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  if (browserLang.startsWith('ko')) return 'ko-KR';
  if (browserLang.startsWith('ru')) return 'ru-RU';
  if (browserLang.startsWith('fa')) return 'fa-IR';
  
  // 默认返回英文
  return 'en-US';
};

// 获取存储的语言或默认语言
const getStoredLanguage = () => {
  // 1. 首先检查是否有手动选择的语言（存储在localStorage中）
  const storedLanguage = localStorage.getItem('language');
  if (storedLanguage) {
    return storedLanguage;
  }
  
  // 2. 如果没有手动选择的语言，使用设备语言
  const browserLanguage = getBrowserLanguage();
  if (browserLanguage) {
    return browserLanguage;
  }
  
  // 3. 最后使用配置文件中的默认语言
  return DEFAULT_CONFIG.defaultLanguage;
};

// 支持的语言列表
const supportedLocales = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR', 'ru-RU', 'fa-IR'];

// 动态加载语言文件
const loadLocaleMessages = async (isLoggedIn) => {
  const messages = {};
  
  try {
    // 无论登录状态如何，首先尝试从index文件加载所有语言
    let indexModule = null;
    
    // 根据登录状态从主目录或auth目录加载语言文件
    
    if (isLoggedIn) {
      // 已登录：尝试从主目录index加载
      try {
        indexModule = await import(/* webpackChunkName: "locale-index" */ './locales/index.js');
      } catch (e) {
        // 安静地处理错误
      }
    } else {
      // 未登录：尝试从auth目录index加载
      try {
        indexModule = await import(/* webpackChunkName: "locale-auth-index" */ './locales/auth/index.js');
      } catch (e) {
        // 安静地处理错误
      }
    }
    
    // 如果成功加载了索引文件，先从中获取语言
    if (indexModule && indexModule.default) {
      for (const locale of supportedLocales) {
        if (indexModule.default[locale]) {
          messages[locale] = indexModule.default[locale];
        }
      }
    }
    
    // 检查是否所有语言都已加载，如果没有，单独加载缺失的语言
    for (const locale of supportedLocales) {
      if (!messages[locale]) {
        try {
          let module = null;
          
          // 使用更明确的导入路径
          if (locale === 'zh-CN') {
            module = await import(/* webpackChunkName: "locale-zh-CN" */ './locales/zh-CN.js');
          } else if (locale === 'en-US') {
            module = await import(/* webpackChunkName: "locale-en-US" */ './locales/en-US.js');
          } else if (locale === 'zh-TW') {
            module = await import(/* webpackChunkName: "locale-zh-TW" */ './locales/zh-TW.js');
          } else if (locale === 'ja-JP') {
            module = await import(/* webpackChunkName: "locale-ja-JP" */ './locales/ja-JP.js');
          } else if (locale === 'ko-KR') {
            module = await import(/* webpackChunkName: "locale-ko-KR" */ './locales/ko-KR.js');
          } else if (locale === 'ru-RU') {
            module = await import(/* webpackChunkName: "locale-ru-RU" */ './locales/ru-RU.js');
          } else if (locale === 'fa-IR') {
            module = await import(/* webpackChunkName: "locale-fa-IR" */ './locales/fa-IR.js');
          }
          
          if (module && module.default) {
            messages[locale] = module.default;
          }
        } catch (e) {
          // 安静地处理错误
          
          // 如果失败且不是英文，尝试加载英文作为后备
          if (locale !== 'en-US') {
            try {
              const fallbackModule = await import(/* webpackChunkName: "locale-en-US-fallback" */ './locales/en-US.js');
              if (fallbackModule && fallbackModule.default) {
                messages[locale] = fallbackModule.default;
              }
            } catch (fallbackError) {
              // 安静地处理错误
            }
          }

        }
      }
    }
  } catch (e) {
    // 安静地处理错误
  }
  
  return injectSiteName(messages);
};

// 创建i18n实例
const i18n = createI18n({
  legacy: false, // 使用组合式API
  locale: getStoredLanguage(),
  fallbackLocale: 'en-US',
  messages: {}, // 初始为空，稍后动态加载
  silentTranslationWarn: true, 
  missingWarn: false, // 禁用缺失警告
  fallbackWarn: false // 禁用回退警告
});

// 切换语言
export const setLanguage = async (lang) => {
  // 检查语言是否支持
  if (!supportedLocales.includes(lang)) {
    lang = 'en-US'; // 默认回退到英文
  }
  
  // 如果语言包未加载或者需要确保加载了完整的语言包，重新加载
  const isLoggedIn = checkLoginStatus();
  
  // 清除现有的语言消息，确保完全重新加载
  for (const locale of supportedLocales) {
    i18n.global.setLocaleMessage(locale, {});
  }
  
  const messages = await loadLocaleMessages(isLoggedIn);
  
  // 设置所有可用的语言消息
  for (const locale in messages) {
    if (messages[locale]) {
      i18n.global.setLocaleMessage(locale, messages[locale]);
    }
  }
  
  // 设置当前语言
  i18n.global.locale.value = lang;
  localStorage.setItem('language', lang);
  document.querySelector('html').setAttribute('lang', lang);
  
  // 立即更新页面标题
  updatePageTitle();
  
  // 延迟再次更新标题，确保DOM完全更新后标题正确
  setTimeout(() => {
    updatePageTitle();
  }, 300);
  
  return {
    success: true,
    availableLocales: Object.keys(messages)
  };
};

// 更新页面标题的函数
export const updatePageTitle = () => {
  // 检查是否有router和当前路由
  if (window.router?.currentRoute?.value?.meta?.titleKey) {
    const titleKey = window.router.currentRoute.value.meta.titleKey;
    try {
      const translatedTitle = i18n.global.t(titleKey);
      document.title = `${translatedTitle} - ${SITE_CONFIG.siteName}`;
    } catch (error) {
      // 安静地处理错误
      // 回退到网站名称
      document.title = SITE_CONFIG.siteName;
    }
  } else if (window.router?.currentRoute?.value) {
    // 如果当前路由没有titleKey，至少设置网站名称
    document.title = SITE_CONFIG.siteName;
  }
};

// 重新加载语言包（登录/登出时调用）
export const reloadMessages = async () => {
  const isLoggedIn = checkLoginStatus();
  
  // 清除现有的语言消息，确保完全重新加载
  for (const locale of supportedLocales) {
    i18n.global.setLocaleMessage(locale, {});
  }
  
  const messages = await loadLocaleMessages(isLoggedIn);
  
  // 获取当前语言
  const currentLang = i18n.global.locale.value;
  
  // 设置所有语言消息，而不仅是当前语言
  for (const locale in messages) {
    if (messages[locale]) {
      i18n.global.setLocaleMessage(locale, messages[locale]);
    }
  }
  
  // 确保当前语言仍然活跃
  i18n.global.locale.value = currentLang;
  
  // 强制更新页面标题
  updatePageTitle();
  
  // 延迟再次更新标题，确保DOM完全更新
  setTimeout(() => {
    updatePageTitle();
  }, 300);
  
  // 返回一个指示是否成功的结果
  return {
    success: true,
    availableLocales: Object.keys(messages)
  };
};

// 初始化加载语言
(async () => {
  try {
    const isLoggedIn = checkLoginStatus();
    const initialLang = getStoredLanguage();
    
    const messages = await loadLocaleMessages(isLoggedIn);
    
    // 设置所有语言消息
    for (const locale in messages) {
      if (messages[locale]) {
        i18n.global.setLocaleMessage(locale, messages[locale]);
      }
    }
    
    // 设置当前语言
    i18n.global.locale.value = initialLang;
    
    // 页面加载时更新标题
    updatePageTitle();
  } catch (error) {
    // 安静地处理错误
  }
})();

export default i18n;
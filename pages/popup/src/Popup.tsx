import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useEffect, useState } from 'react';

interface CozeTemplate {
  bgImg: string | null;
  appType: string | null;
  title: string | null;
  author: string | null;
  desc: string | null;
  price: string | null;
  copyCount: number | null;
}

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [isCozeTemplatePage, setIsCozeTemplatePage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataCount, setDataCount] = useState(0);

  useEffect(() => {
    getCurrentTabUrl();
  }, []);

  const getCurrentTabUrl = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url || '';
    setIsCozeTemplatePage(url.includes('coze.cn/template'));
  };

  const handleScrapeCoze = async () => {
    setIsLoading(true);
    setDataCount(0);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setIsLoading(false);
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function scrapeCozeTemplates(): CozeTemplate[] {
          const cards = document.querySelectorAll('article');
          const results: CozeTemplate[] = [];

          cards.forEach(card => {
            const bgImgElement = card.querySelector('div > div > img');
            const bgImg = bgImgElement?.getAttribute('src') || null;

            const appTypeContainers = Array.from(card.querySelectorAll('div.semi-tag-content'));
            const appTypeElement = appTypeContainers.find(el => el.textContent?.includes('智能体'));
            const appType = appTypeElement?.textContent?.trim() || null;

            const titleElements = card.querySelectorAll('.semi-typography-ellipsis span');
            const title = titleElements.length > 0 ? titleElements[0].textContent?.trim() || null : null;

            const avatarElement = card.querySelector('div.semi-image[style*="width: 14px"]');
            const authorElement = avatarElement?.nextElementSibling?.querySelector('span > span');
            const author = authorElement?.textContent?.trim() || null;

            const descElement = card.querySelector('span.semi-typography-ellipsis-multiple-line span');
            const desc = descElement?.textContent?.trim() || null;

            const priceElement = card.querySelector('div.font-medium');
            const price = priceElement?.textContent?.trim() || null;

            const statsElements = card.querySelectorAll('div.flex.items-center span');
            const copyCount =
              statsElements.length > 0 ? parseInt(statsElements[0].textContent?.trim() || '0', 10) : null;

            results.push({
              bgImg,
              appType,
              title,
              author,
              desc,
              price,
              copyCount,
            });
          });

          return results;
        }
        return scrapeCozeTemplates();
      },
    });

    setIsLoading(false);

    if (results && results[0]?.result) {
      const data = results[0].result as CozeTemplate[];
      setDataCount(data.length);

      // 转换为 CSV 格式
      const headers = ['标题', '作者', '描述', '应用类型', '价格', '复制次数', '背景图'];
      const csvRows = [
        headers.join(','), // 表头
        ...data.map((item: CozeTemplate) =>
          [
            `"${item.title || ''}"`,
            `"${item.author || ''}"`,
            `"${item.desc || ''}"`,
            `"${item.appType || ''}"`,
            `"${item.price || ''}"`,
            item.copyCount || '',
            `"${item.bgImg || ''}"`,
          ].join(','),
        ),
      ];
      const csvContent = csvRows.join('\n');

      // 添加 BOM 以确保 Excel 正确显示中文
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'coze_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`w-80 min-h-64 p-4 ${isLight ? 'bg-white text-gray-800' : 'bg-gray-900 text-gray-100'} transition-colors duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Coze 模板抓取器</h1>
        <div className="flex items-center">
          <ToggleButton>{t('toggleTheme')}</ToggleButton>
        </div>
      </div>

      <div className={`p-4 mb-4 rounded-lg ${isLight ? 'bg-blue-50' : 'bg-gray-800'}`}>
        <div className="flex flex-col space-y-4">
          <p className={`text-sm ${isCozeTemplatePage ? 'text-green-600' : 'text-red-500'}`}>
            {isCozeTemplatePage ? '✓ 已检测到 Coze 模板页面' : '❌ 请在 coze.cn/template 页面使用此扩展'}
          </p>

          <button
            onClick={handleScrapeCoze}
            disabled={!isCozeTemplatePage || isLoading}
            className={`
              py-2 px-4 rounded-md font-medium text-white 
              transition-all duration-200 transform hover:scale-105 active:scale-95
              shadow-md flex items-center justify-center space-x-2
              ${
                isCozeTemplatePage && !isLoading
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                  : 'bg-gray-400 cursor-not-allowed'
              }
            `}>
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>数据抓取中...</span>
              </>
            ) : (
              <span>获取 Coze 模板数据</span>
            )}
          </button>

          {dataCount > 0 && (
            <div className={`text-sm ${isLight ? 'text-green-600' : 'text-green-400'} text-center animate-fade-in`}>
              成功获取 {dataCount} 条模板数据
            </div>
          )}
        </div>
      </div>

      <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'} text-center mt-4`}>
        数据将以 CSV 格式导出，可直接用 Excel 打开
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);

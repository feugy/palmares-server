const outputs = [{
  reporter: 'console',
  output: 'stdout'
},{
  reporter: 'html',
  output: 'coverage/index.html'
}]

if (process.env.CI) {
  outputs.push({
    reporter: 'lcov',
    output: 'coverage/lcov.info'
  })
}

module.exports = {
  coverage: true,
  leaks: true,
  globals: '_registeredHandlers,_eventHandlers,DOMException,NamedNodeMap,Attr,'
    + 'Node,Element,DocumentFragment,HTMLDocument,Document,XMLDocument,'
    + 'CharacterData,Text,CDATASection,ProcessingInstruction,Comment,'
    + 'DocumentType,DOMImplementation,NodeList,HTMLCollection,'
    + 'HTMLOptionsCollection,DOMStringMap,DOMTokenList,SVGAnimatedString,'
    + 'SVGNumber,SVGStringList,Event,CustomEvent,MessageEvent,ErrorEvent,'
    + 'HashChangeEvent,FocusEvent,PopStateEvent,UIEvent,MouseEvent,'
    + 'KeyboardEvent,TouchEvent,ProgressEvent,CompositionEvent,WheelEvent,'
    + 'EventTarget,Location,History,Blob,File,FileList,DOMParser,FormData,'
    + 'XMLHttpRequestEventTarget,XMLHttpRequestUpload,NodeIterator,TreeWalker,'
    + 'HTMLElement,HTMLAnchorElement,HTMLAreaElement,HTMLAudioElement,'
    + 'HTMLBaseElement,HTMLBodyElement,HTMLBRElement,HTMLButtonElement,'
    + 'HTMLCanvasElement,HTMLDataElement,HTMLDataListElement,'
    + 'HTMLDetailsElement,HTMLDialogElement,HTMLDirectoryElement,'
    + 'HTMLDivElement,HTMLDListElement,HTMLEmbedElement,HTMLFieldSetElement,'
    + 'HTMLFontElement,HTMLFormElement,HTMLFrameElement,HTMLFrameSetElement,'
    + 'HTMLHeadingElement,HTMLHeadElement,HTMLHRElement,HTMLHtmlElement,'
    + 'HTMLIFrameElement,HTMLImageElement,HTMLInputElement,HTMLLabelElement,'
    + 'HTMLLegendElement,HTMLLIElement,HTMLLinkElement,HTMLMapElement,'
    + 'HTMLMarqueeElement,HTMLMediaElement,HTMLMenuElement,HTMLMetaElement,'
    + 'HTMLMeterElement,HTMLModElement,HTMLObjectElement,HTMLOListElement,'
    + 'HTMLOptGroupElement,HTMLOptionElement,HTMLOutputElement,'
    + 'HTMLParagraphElement,HTMLParamElement,HTMLPictureElement,HTMLPreElement,'
    + 'HTMLProgressElement,HTMLQuoteElement,HTMLScriptElement,'
    + 'HTMLSelectElement,HTMLSourceElement,HTMLSpanElement,HTMLStyleElement,'
    + 'HTMLTableCaptionElement,HTMLTableCellElement,HTMLTableColElement,'
    + 'HTMLTableElement,HTMLTimeElement,HTMLTitleElement,HTMLTableRowElement,'
    + 'HTMLTableSectionElement,HTMLTemplateElement,HTMLTextAreaElement,'
    + 'HTMLTrackElement,HTMLUListElement,HTMLUnknownElement,HTMLVideoElement,'
    + 'SVGElement,SVGGraphicsElement,SVGSVGElement,StyleSheet,MediaList,'
    + 'CSSStyleSheet,CSSRule,CSSStyleRule,CSSMediaRule,CSSImportRule,'
    + 'CSSStyleDeclaration,StyleSheetList,XPathException,XPathExpression,'
    + 'XPathResult,XPathEvaluator,NodeFilter,URL,URLSearchParams,Window,_core,'
    + '_globalProxy,_document,_sessionHistory,_virtualConsole,_runScripts,_top,'
    + '_parent,_frameElement,_length,_pretendToBeVisual,length,window,'
    + 'frameElement,frames,self,parent,top,document,external,location,history,'
    + 'navigator,addEventListener,removeEventListener,dispatchEvent,'
    + '__stopAllTimers,Option,Image,Audio,postMessage,atob,btoa,FileReader,'
    + 'AbortSignal,AbortController,XMLHttpRequest,stop,close,getComputedStyle,'
    + 'captureEvents,releaseEvents,name,innerWidth,innerHeight,outerWidth,'
    + 'outerHeight,pageXOffset,pageYOffset,screenX,screenY,screenLeft,'
    + 'screenTop,scrollX,scrollY,scrollTop,scrollLeft,screen,alert,blur,'
    + 'confirm,createPopup,focus,moveBy,moveTo,open,print,prompt,resizeBy,'
    + 'resizeTo,scroll,scrollBy,scrollTo,core,System,asap,Observable,'
    + 'regeneratorRuntime,_babelPolyfill,__core-js_shared__,core,System,asap,'
    + 'Observable,regeneratorRuntime,CloseEvent,BarProp,Screen,Performance,'
    + 'locationbar,menubar,personalbar,scrollbars,statusbar,toolbar,'
    + 'performance,WebSocket,devicePixelRatio',
  lint: true,
  'lint-warnings-threshold': 10,
  threshold: 95,
  transform: '../node_modules/lab-espower-transformer',
  verbose: true,
  reporter: outputs.map(o => o.reporter),
  output: outputs.map(o => o.output)
}

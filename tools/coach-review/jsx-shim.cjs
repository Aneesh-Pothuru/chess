// Minimal jsx-runtime shim: renders react-chessboard's piece JSX to SVG strings.
function styleToCss(o){ return Object.entries(o).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';'); }
function render(type, props){
  if (typeof type === 'function') return render2(type({}));
  const { children, ...attrs } = props || {};
  const a = Object.entries(attrs)
    .filter(([k,v]) => v != null && k !== 'svgStyle')
    .map(([k,v]) => {
      if (k === 'style') return typeof v === 'object' ? `style="${styleToCss(v)}"` : `style="${v}"`;
      if (k === 'strokeWidth') return `stroke-width="${v}"`;
      if (k === 'strokeLinecap') return `stroke-linecap="${v}"`;
      if (k === 'strokeLinejoin') return `stroke-linejoin="${v}"`;
      if (k === 'strokeMiterlimit') return `stroke-miterlimit="${v}"`;
      if (k === 'fillRule') return `fill-rule="${v}"`;
      return `${k}="${v}"`;
    }).join(' ');
  const kids = children == null ? '' : (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? c : c.__svg).join('');
  return { __svg: `<${type} ${a}>${kids}</${type}>` };
}
function render2(el){ return el; }
exports.jsx = (t, p) => render(t, p);
exports.jsxs = (t, p) => render(t, p);
exports.Fragment = 'g';
// React API stubs so @dnd-kit module init doesn't crash (never actually invoked).
exports.createContext = (v) => ({ Provider: 'g', Consumer: 'g', _v: v });
exports.forwardRef = (f) => f;
exports.memo = (f) => f;
exports.createElement = exports.jsx;
exports.useContext = () => ({});
exports.useState = (v) => [v, () => {}];
exports.useMemo = (f) => f();
exports.useCallback = (f) => f;
exports.useEffect = () => {};
exports.useLayoutEffect = () => {};
exports.useRef = (v) => ({ current: v });
exports.useReducer = (r, i) => [i, () => {}];
exports.useId = () => 'id';
exports.StrictMode = 'g';
exports.Component = class {};
exports.PureComponent = class {};
exports.cloneElement = (e) => e;
exports.isValidElement = () => false;
exports.Children = { map: (c, f) => [], forEach: () => {}, only: (c) => c, toArray: () => [] };
exports.default = exports;

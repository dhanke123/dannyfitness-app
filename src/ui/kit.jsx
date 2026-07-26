/* Shared UI primitives. */

import { T, body, disp } from "../theme.js";

/* ---------- shared ui ---------- */
export const Chip = ({active,onClick,children}) => (
  <button onClick={onClick} className="px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap"
    style={{...body, background:active?T.ink:"transparent", color:active?T.paper:T.ink, border:`1.5px solid ${active?T.ink:T.line}`}}>
    {children}</button>);

export const Btn = ({onClick,children,kind="primary",disabled,full,small}) => (
  <button onClick={onClick} disabled={disabled}
    className={`${small?"py-2 px-3 text-xs":"py-3 px-5 text-sm"} rounded-xl font-bold ${full?"w-full":""}`}
    style={{...body, background:disabled?T.line:kind==="primary"?T.accent:kind==="dark"?T.ink:kind==="plum"?T.plum:"transparent",
      color:disabled?T.muted:kind==="ghost"?T.ink:"#fff", border:kind==="ghost"?`1.5px solid ${T.line}`:"none"}}>
    {children}</button>);

export const Card = ({children,className="",style={}}) => (
  <div className={`rounded-2xl p-4 ${className}`} style={{background:T.card, border:`1.5px solid ${T.line}`, ...style}}>{children}</div>);

export const Ticks = ({cap,n}) => (
  <div className="flex gap-0.5 flex-wrap">{Array.from({length:cap}).map((_,i)=>(
    <span key={i} style={{width:7,height:12,borderRadius:1.5,background:i<n?T.ink:"transparent",border:`1.5px solid ${i<n?T.ink:T.line}`}}/>))}</div>);

export const H = ({children}) => <h2 style={{...disp,fontWeight:700,fontSize:22}} className="mb-3">{children}</h2>;

export const Sub = ({children}) => <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>{children}</div>;

export const QR = () => (
  <div className="mx-auto my-2 p-3 rounded-xl" style={{background:"#fff",border:`1.5px solid ${T.line}`,width:150}}>
    <div className="grid grid-cols-10 gap-px" style={{width:120,height:120}}>
      {Array.from({length:100}).map((_,i)=>(<div key={i} style={{background:((i*7+Math.floor(i/10)*3)%5)<2?T.ink:"#fff"}}/>))}</div>
    <div className="text-center text-[10px] mt-1.5 font-bold" style={{...body,color:"#7B1FA2"}}>PAYNOW · UEN 2024XXXXX</div>
  </div>);

export const Stars = ({value,onRate}) => (
  <div className="flex gap-1">{[1,2,3,4,5].map(n=>(
    <button key={n} onClick={()=>onRate(n)} className="text-2xl leading-none" style={{color:n<=value?T.accent:T.line}}>★</button>))}</div>);

export const Select = ({value,onChange,options,style={}}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    className="px-3 py-2 rounded-lg text-sm font-semibold outline-none"
    style={{...body, border:`1.5px solid ${T.line}`, background:T.card, color:T.ink, ...style}}>
    {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
  </select>);

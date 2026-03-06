"use client";

import { useEffect, useMemo, useState } from "react";
import {
LineChart,
Line,
XAxis,
YAxis,
Tooltip,
CartesianGrid,
ResponsiveContainer,
Legend
} from "recharts";

type HistoryItem = {
id: number;
created_at: string;
altins1: string | number;
usdtry: string | number;
xauusd: string | number;
gram_altin: string | number;
teorik_altins1: string | number;
prim_yuzde: string | number;
};

function fmt(n: number, digits = 2) {
return n.toLocaleString("tr-TR", {
minimumFractionDigits: digits,
maximumFractionDigits: digits
});
}

function badgeForPrim(p: number) {
if (p >= 10) return { text: "Pahalı", bg: "#ecfdf5", fg: "#065f46" };
if (p >= 3) return { text: "Primli", bg: "#eff6ff", fg: "#1d4ed8" };
if (p <= -10) return { text: "Ucuz", bg: "#fef2f2", fg: "#991b1b" };
if (p <= -3) return { text: "İskontolu", bg: "#fff7ed", fg: "#9a3412" };
return { text: "Nötr", bg: "#f3f4f6", fg: "#111827" };
}

export default function Page() {

const [data,setData] = useState<any>(null);
const [history,setHistory] = useState<HistoryItem[]>([]);
const [err,setErr] = useState<string | null>(null);
const [loading,setLoading] = useState(false);

async function load() {

setLoading(true);
setErr(null);

try {

const res = await fetch("/api/history",{cache:"no-store"});
const json = await res.json();

if(json.error){
throw new Error(json.message);
}

const items = json.items ?? [];

setHistory(items);

if(items.length>0){

const last = items[items.length-1];

setData({
timestamp:last.created_at,
values:{
altins1:Number(last.altins1),
usdtry:Number(last.usdtry),
xauusd:Number(last.xauusd),
gram_altin:Number(last.gram_altin)
},
calculations:{
teorik_altins1:Number(last.teorik_altins1),
prim_yuzde:Number(last.prim_yuzde)
}
});

}

} catch(e:any){

setErr(e?.message ?? "Bilinmeyen hata");

} finally {

setLoading(false);

}

}

useEffect(()=>{
load();
},[]);

const prim = data?.calculations?.prim_yuzde;

const primBadge = useMemo(()=>{
if(prim==null) return {text:"-",bg:"#f3f4f6",fg:"#111827"};
return badgeForPrim(prim);
},[prim]);

const chartData = useMemo(()=>{

return history.map((item)=>({

time:new Date(item.created_at).toLocaleDateString("tr-TR"),

altins1:Number(item.altins1),
teorik:Number(item.teorik_altins1),
prim:Number(item.prim_yuzde)

}));

},[history]);

return (

<main style={{
minHeight:"100vh",
background:"#ffffff",
color:"#0f172a",
padding:"28px 16px",
fontFamily:'ui-sans-serif,system-ui'
}}>

<div style={{maxWidth:1100,margin:"0 auto"}}>

<h1 style={{fontSize:32,margin:0}}>ALTIN.S1 Analyzer</h1>

<p style={{marginTop:6,color:"#475569"}}>
Veriler Supabase arşivinden okunur (cron veri toplar)
</p>

{err && (
<div style={{
marginTop:16,
background:"#fee2e2",
padding:12,
borderRadius:10
}}>
Hata: {err}
</div>
)}

<div style={{
marginTop:20,
display:"grid",
gridTemplateColumns:"repeat(12,1fr)",
gap:14
}}>

<Card title="ALTIN.S1" value={data?fmt(data.values.altins1,2)+" TL":"—"} span={4}/>
<Card title="Teorik ALTIN.S1" value={data?fmt(data.calculations.teorik_altins1,2)+" TL":"—"} span={4}/>

<Card
title="Prim"
value={data?fmt(data.calculations.prim_yuzde,2)+"%":"—"}
span={4}
right={
<span style={{
padding:"6px 10px",
borderRadius:999,
background:primBadge.bg,
color:primBadge.fg,
fontWeight:700,
fontSize:13
}}>
{primBadge.text}
</span>
}
/>

<Card title="USDTRY" value={data?fmt(data.values.usdtry,4):"—"} span={4}/>
<Card title="XAUUSD" value={data?fmt(data.values.xauusd,2):"—"} span={4}/>
<Card title="Gram Altın" value={data?fmt(data.values.gram_altin,2):"—"} span={4}/>

<Card
title="ALTIN.S1 vs Teorik"
span={12}
value=""
body={
<div style={{width:"100%",height:320}}>
<ResponsiveContainer width="100%" height="100%">
<LineChart data={chartData}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="time"/>
<YAxis/>
<Tooltip/>
<Legend/>
<Line type="monotone" dataKey="altins1" stroke="#2563eb" strokeWidth={2}/>
<Line type="monotone" dataKey="teorik" stroke="#16a34a" strokeWidth={2}/>
</LineChart>
</ResponsiveContainer>
</div>
}
/>

<Card
title="Prim (%)"
span={12}
value=""
body={
<div style={{width:"100%",height:280}}>
<ResponsiveContainer width="100%" height="100%">
<LineChart data={chartData}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="time"/>
<YAxis/>
<Tooltip/>
<Legend/>
<Line type="monotone" dataKey="prim" stroke="#dc2626" strokeWidth={2}/>
</LineChart>
</ResponsiveContainer>
</div>
}
/>

</div>

</div>

</main>

);

}

function Card({title,value,span,right,body}:{title:string,value?:string,span:number,right?:React.ReactNode,body?:React.ReactNode}){

return (

<section style={{
gridColumn:`span ${span}`,
border:"1px solid #e2e8f0",
borderRadius:14,
padding:16,
background:"#fff"
}}>

<div style={{display:"flex",justifyContent:"space-between"}}>

<div>

<div style={{fontSize:13,color:"#64748b"}}>{title}</div>

{value && (
<div style={{
marginTop:6,
fontSize:24,
fontWeight:800
}}>
{value}
</div>
)}

</div>

{right}

</div>

{body && <div style={{marginTop:14}}>{body}</div>}

</section>

);

}
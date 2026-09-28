import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=process.env.PORT||10000;
const SCD_BACKEND=process.env.SCD_BACKEND_URL||"https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec";

app.use(express.json({limit:"1mb"}));

app.post("/api/scd",async(req,res)=>{
  try{
    const upstream=await fetch(SCD_BACKEND,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(req.body||{}),
      redirect:"follow"
    });
    const text=await upstream.text();
    res.status(upstream.status).type(upstream.headers.get("content-type")||"application/json").send(text);
  }catch(err){
    console.error("SCD backend proxy",err);
    res.status(502).json({ok:false,error:"Backend SCD temporaneamente non raggiungibile"});
  }
});

app.get("/api/health",(req,res)=>res.json({ok:true,service:"SCD R21.3",time:new Date().toISOString()}));
app.use(express.static(path.join(__dirname,"dist"),{maxAge:"1h"}));
app.use((req,res)=>res.sendFile(path.join(__dirname,"dist","index.html")));
app.listen(PORT,()=>console.log("SCD Super App on",PORT));
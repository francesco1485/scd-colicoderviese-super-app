import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";

const schema=z.object({
  municipality:z.string().trim().min(2).max(80),
  limit:z.number().int().min(20).max(500).default(300)
});
type Input=z.infer<typeof schema>;

interface BusinessRow{
  source:string;sourceId:string;name:string;category:string;website:string;phone:string;email:string;
  address:string;lat:number|null;lon:number|null;
}
interface Result{
  municipality:string;generatedAt:string;source:string;attribution:string;coverage:string;count:number;items:BusinessRow[];
}

function clean(v:unknown){return String(v??"").trim()}
function category(tags:Record<string,string>){
  if(tags.shop)return "SHOP:"+tags.shop;
  if(tags.office)return "OFFICE:"+tags.office;
  if(tags.craft)return "CRAFT:"+tags.craft;
  if(tags.tourism)return "TOURISM:"+tags.tourism;
  if(tags.industrial)return "INDUSTRIAL:"+tags.industrial;
  if(tags.amenity)return "AMENITY:"+tags.amenity;
  return "BUSINESS";
}

export default class MapMunicipalityBusinessesCommand extends BaseCommand<Input,Result>{
  public readonly name="map-municipality-businesses";
  public readonly version="1.0.0";
  public readonly schema=schema;
  public override readonly executionMode="sync" as const;
  public override readonly allowedRoles=["STAFF","MANAGER","SECRETARIAT","TOURNAMENTS","DIRECTION","ADMIN","SYSTEM"] as const;

  public async execute(input:Input,context:CommandContext):Promise<Result>{
    const place=input.municipality.replace(/[\r\n"'\\]/g," ").replace(/\s+/g," ").trim();
    const query='[out:json][timeout:25];'
      +'area["boundary"="administrative"]["admin_level"="8"]["name"="'+place+'"]->.a;'
      +'('
      +'nwr(area.a)["name"]["shop"];'
      +'nwr(area.a)["name"]["office"];'
      +'nwr(area.a)["name"]["craft"];'
      +'nwr(area.a)["name"]["tourism"];'
      +'nwr(area.a)["name"]["industrial"];'
      +'nwr(area.a)["name"]["amenity"~"restaurant|cafe|bar|bank|pharmacy|clinic|fuel|car_rental|car_repair|marketplace|cinema|theatre"];'
      +');out center tags '+input.limit+';';

    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),28000);
    let response:Response;
    try{
      response=await fetch("https://overpass-api.de/api/interpreter",{
        method:"POST",
        headers:{
          "content-type":"application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent":"SCD-ColicoDerviese-Lia/42.0 (+https://github.com/francesco1485/scd-colicoderviese-super-app)"
        },
        body:new URLSearchParams({data:query}),
        signal:ctrl.signal
      });
    }finally{clearTimeout(timer)}
    if(!response.ok)throw new Error("OpenStreetMap/Overpass non disponibile: "+response.status);
    const raw=await response.json() as {elements?:Array<any>};
    const seen=new Set<string>();
    const items:BusinessRow[]=[];
    for(const el of raw.elements??[]){
      const t=(el.tags??{}) as Record<string,string>;
      const name=clean(t.name||t.brand||t.operator);
      if(!name)continue;
      const sourceId=String(el.type||"")+"/"+String(el.id||"");
      if(seen.has(sourceId))continue;
      seen.add(sourceId);
      const center=el.center??{};
      items.push({
        source:"OPENSTREETMAP",
        sourceId,
        name,
        category:category(t),
        website:clean(t["contact:website"]||t.website),
        phone:clean(t["contact:phone"]||t.phone),
        email:clean(t["contact:email"]||t.email),
        address:[t["addr:street"],t["addr:housenumber"],t["addr:postcode"],t["addr:city"]].filter(Boolean).join(" "),
        lat:typeof el.lat==="number"?el.lat:(typeof center.lat==="number"?center.lat:null),
        lon:typeof el.lon==="number"?el.lon:(typeof center.lon==="number"?center.lon:null)
      });
    }
    const result:Result={
      municipality:place,
      generatedAt:new Date().toISOString(),
      source:"OPENSTREETMAP_OVERPASS",
      attribution:"© OpenStreetMap contributors · ODbL",
      coverage:"PARTIAL_NOT_EXHAUSTIVE",
      count:items.length,
      items
    };
    await context.events.publish({
      type:"lia.territory_mapping.completed",
      tenantId:context.tenantId,
      correlationId:context.correlationId,
      actorId:context.actor.userId,
      occurredAt:result.generatedAt,
      payload:{municipality:place,count:items.length,source:result.source,coverage:result.coverage}
    });
    return result;
  }
}

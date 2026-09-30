export interface BusinessRow{
  source:string;sourceId:string;name:string;category:string;website:string;phone:string;email:string;
  address:string;lat:number|null;lon:number|null;
}
export interface MunicipalityBusinessMap{
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

export async function mapMunicipalityBusinesses(
  municipality:string,
  limit=300,
  signal?:AbortSignal
):Promise<MunicipalityBusinessMap>{
  const place=municipality.replace(/[\r\n"'\\]/g," ").replace(/\s+/g," ").trim();
  if(place.length<2||place.length>80)throw new Error("Comune non valido");
  const safeLimit=Math.min(500,Math.max(20,limit));
  const query='[out:json][timeout:25];'
    +'area["boundary"="administrative"]["admin_level"="8"]["name"="'+place+'"]->.a;'
    +'('
    +'nwr(area.a)["name"]["shop"];'
    +'nwr(area.a)["name"]["office"];'
    +'nwr(area.a)["name"]["craft"];'
    +'nwr(area.a)["name"]["tourism"];'
    +'nwr(area.a)["name"]["industrial"];'
    +'nwr(area.a)["name"]["amenity"~"restaurant|cafe|bar|bank|pharmacy|clinic|fuel|car_rental|car_repair|marketplace|cinema|theatre"];'
    +');out center tags '+safeLimit+';';

  const response=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",
    headers:{
      "content-type":"application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent":"SCD-ColicoDerviese-Lia/42.0 (+https://github.com/francesco1485/scd-colicoderviese-super-app)"
    },
    body:new URLSearchParams({data:query}),
    signal
  });
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
  return {
    municipality:place,
    generatedAt:new Date().toISOString(),
    source:"OPENSTREETMAP_OVERPASS",
    attribution:"© OpenStreetMap contributors · ODbL",
    coverage:"PARTIAL_NOT_EXHAUSTIVE",
    count:items.length,
    items
  };
}

import fs from "node:fs";
import path from "node:path";

const root=path.resolve(new URL("..",import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1"));
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const assert=(cond,msg)=>{if(!cond)throw new Error("LIA CONTRACT: "+msg)};

const manifest=JSON.parse(read("SCD_SYSTEM_MANIFEST.json"));
const router=read("app-r24-router.js");
const bridge=read("backend_patch_R21_6_http_api.gs");
const patch=read("backend_patch_R42_lia_commercial.gs");

for(const id of ["CAP-LIA-OPERATOR","CAP-LIA-TERRITORY-MAPPING","CAP-COMMERCIAL-DEVELOPMENT-OS"]){
  assert((manifest.capability_map||[]).some(x=>x.id===id),"missing capability "+id);
}
const lia=(manifest.capability_map||[]).find(x=>x.id==="CAP-LIA-OPERATOR");
assert(lia.runtime==="R22_COMMAND_PLATFORM","Lia must run on R22 Command Platform");
for(const rule of [
  "NO_BROWSER_ROLE_ESCALATION",
  "SERVER_SIDE_AUTHORIZATION_REQUIRED",
  "HIGH_RISK_IRREVERSIBLE_ACTIONS_REQUIRE_EXPLICIT_APPROVAL",
  "SAFEGUARDING_NEVER_ENTERS_LIA_ORDINARY_PIPELINE",
  "NO_PRIVATE_PERSON_SCRAPING"
]){
  assert((lia.rules||[]).includes(rule),"missing safety rule "+rule);
}

assert(router.includes("'commercial','lia'")||router.includes("'commercial','lia',"),"lia route missing");
assert(router.includes("render_lia(outlet)"),"Lia UI renderer missing");
assert(router.includes("SCD_LIA_HANDOFF_V1"),"remote support handoff missing");
assert(router.includes("map-municipality-businesses"),"mapping command not wired in UI");
assert(router.includes("build-municipality-commercial-map"),"mapping+Drive command not wired in UI");
assert(router.includes("create-drive-folder"),"Drive folder command not wired in UI");

for(const p of [
  "platform/src/adapters/OpenStreetMapBusinessMapper.ts",
  "platform/src/plugins/map-municipality-businesses/MapMunicipalityBusinessesCommand.ts",
  "platform/src/plugins/build-municipality-commercial-map/BuildMunicipalityCommercialMapCommand.ts",
  "platform/src/plugins/create-drive-folder/CreateDriveFolderCommand.ts"
])assert(exists(p),"missing runtime file "+p);

assert(bridge.includes("direction.drive.folder.create"),"R20 folder action missing");
assert(bridge.includes("direction.commercial.mapping.save"),"R20 mapping action missing");
assert(patch.includes("r42RequireDirection_"),"Direction gate missing in R42 backend");
assert(patch.includes("r42CreateDriveFolder_"),"Drive folder implementation missing");
assert(patch.includes("r42SaveCommercialMapping_"),"mapping persistence missing");
assert(!patch.toLowerCase().includes("deletefolder"),"destructive folder deletion must not exist");
assert(patch.includes("PARTIAL_NOT_EXHAUSTIVE"),"mapping coverage disclaimer missing");

console.log("SCD LIA R42 CONTRACT PASS",{
  manifest:manifest.manifest?.version,
  capabilities:["CAP-LIA-OPERATOR","CAP-LIA-TERRITORY-MAPPING"],
  runtime:"R22",
  writeGate:"DIRECTION_ADMIN_R20"
});

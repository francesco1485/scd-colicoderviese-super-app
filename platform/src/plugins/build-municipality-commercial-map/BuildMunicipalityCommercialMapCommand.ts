import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
import { R20BridgeClient } from "../../adapters/R20BridgeClient.js";

const schema=z.object({
  municipality:z.string().trim().min(2).max(80),
  limit:z.number().int().min(20).max(500).default(300),
  dryRun:z.boolean().default(false)
});
type Input=z.infer<typeof schema>;

interface MappingResult{
  municipality:string;generatedAt:string;source:string;attribution:string;coverage:string;count:number;
  items:Array<Record<string,unknown>>;
}

export default class BuildMunicipalityCommercialMapCommand extends BaseCommand<Input,unknown>{
  public readonly name="build-municipality-commercial-map";
  public readonly version="1.0.0";
  public readonly schema=schema;
  public override readonly executionMode="sync" as const;
  public override readonly allowedRoles=["DIRECTION","ADMIN","SYSTEM"] as const;

  public async execute(input:Input,context:CommandContext):Promise<unknown>{
    const endpoint=process.env.SCD_COMMAND_PLATFORM_URL||"";
    if(!endpoint)throw new Error("SCD_COMMAND_PLATFORM_URL non configurato");
    const response=await fetch(endpoint.replace(/\/$/,"")+"/v1/commands/map-municipality-businesses",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-scd-session":context.sessionToken||"",
        "x-correlation-id":context.correlationId
      },
      body:JSON.stringify({municipality:input.municipality,limit:input.limit}),
      signal:context.signal
    });
    const envelope=await response.json() as {result?:MappingResult;error?:string};
    if(!response.ok)throw new Error(envelope.error||"Mapping non riuscito");
    const mapping=(envelope as any).result as MappingResult;
    if(input.dryRun){
      return {ok:true,dryRun:true,mapping};
    }
    if(!context.sessionToken)throw new Error("Sessione Direzione richiesta per salvare il mapping");
    const bridge=new R20BridgeClient();
    const saved=await bridge.call<unknown>(
      "direction.commercial.mapping.save",
      {
        municipality:mapping.municipality,
        generatedAt:mapping.generatedAt,
        source:mapping.source,
        attribution:mapping.attribution,
        coverage:mapping.coverage,
        items:mapping.items
      },
      context.sessionToken
    );
    await context.events.publish({
      type:"lia.commercial_mapping.saved",
      tenantId:context.tenantId,
      correlationId:context.correlationId,
      actorId:context.actor.userId,
      occurredAt:new Date().toISOString(),
      payload:{municipality:mapping.municipality,count:mapping.count}
    });
    return {ok:true,dryRun:false,mapping:{...mapping,items:undefined},saved};
  }
}

import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
import { mapMunicipalityBusinesses, type MunicipalityBusinessMap } from "../../adapters/OpenStreetMapBusinessMapper.js";

const schema=z.object({
  municipality:z.string().trim().min(2).max(80),
  limit:z.number().int().min(20).max(500).default(300)
});
type Input=z.infer<typeof schema>;

export default class MapMunicipalityBusinessesCommand extends BaseCommand<Input,MunicipalityBusinessMap>{
  public readonly name="map-municipality-businesses";
  public readonly version="1.0.0";
  public readonly schema=schema;
  public override readonly executionMode="sync" as const;
  public override readonly allowedRoles=["STAFF","MANAGER","SECRETARIAT","TOURNAMENTS","DIRECTION","ADMIN","SYSTEM"] as const;

  public async execute(input:Input,context:CommandContext):Promise<MunicipalityBusinessMap>{
    const result=await mapMunicipalityBusinesses(input.municipality,input.limit,context.signal);
    await context.events.publish({
      type:"lia.territory_mapping.completed",
      tenantId:context.tenantId,
      correlationId:context.correlationId,
      actorId:context.actor.userId,
      occurredAt:result.generatedAt,
      payload:{municipality:result.municipality,count:result.count,source:result.source,coverage:result.coverage}
    });
    return result;
  }
}

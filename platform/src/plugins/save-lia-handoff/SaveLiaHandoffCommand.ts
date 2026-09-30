import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
import { R20BridgeClient } from "../../adapters/R20BridgeClient.js";

const refSchema=z.object({
  name:z.string().trim().max(180).optional(),
  type:z.string().trim().max(80).optional(),
  id:z.string().trim().max(180).optional(),
  url:z.string().trim().max(700).optional()
});

const schema=z.object({
  command:z.string().trim().min(1).max(5000),
  module:z.string().trim().max(80).default("LIA"),
  entityType:z.string().trim().max(80).optional(),
  entityId:z.string().trim().max(160).optional(),
  currentState:z.string().trim().max(1000).optional(),
  requestedOutput:z.string().trim().max(1000).optional(),
  refs:z.array(refSchema).max(20).default([])
});
type Input=z.infer<typeof schema>;

export default class SaveLiaHandoffCommand extends BaseCommand<Input,unknown>{
  public readonly name="save-lia-handoff";
  public readonly version="1.0.0";
  public readonly schema=schema;
  public override readonly executionMode="sync" as const;
  public override readonly allowedRoles=[
    "MISTER","STAFF","MANAGER","SECRETARIAT","REGISTRATION","TOURNAMENTS","DIRECTION","ADMIN","SYSTEM"
  ] as const;

  public async execute(input:Input,context:CommandContext):Promise<unknown>{
    if(!context.sessionToken)throw new Error("Sessione SCD richiesta per creare un handoff Lia");
    const bridge=new R20BridgeClient();
    const result=await bridge.call<unknown>("private.lia.handoff.save",input,context.sessionToken);
    await context.events.publish({
      type:"lia.remote_handoff.saved",
      tenantId:context.tenantId,
      correlationId:context.correlationId,
      actorId:context.actor.userId,
      occurredAt:new Date().toISOString(),
      payload:{module:input.module,entityType:input.entityType||"",entityId:input.entityId||""}
    });
    return result;
  }
}

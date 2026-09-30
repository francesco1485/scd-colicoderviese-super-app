import { z } from "zod";
import { BaseCommand, type CommandContext } from "../../core/commands/BaseCommand.js";
import { R20BridgeClient } from "../../adapters/R20BridgeClient.js";

const schema=z.object({
  path:z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  purpose:z.string().trim().max(500).optional()
});
type Input=z.infer<typeof schema>;

export default class CreateDriveFolderCommand extends BaseCommand<Input,unknown>{
  public readonly name="create-drive-folder";
  public readonly version="1.0.0";
  public readonly schema=schema;
  public override readonly executionMode="sync" as const;
  public override readonly allowedRoles=["DIRECTION","ADMIN","SYSTEM"] as const;

  public async execute(input:Input,context:CommandContext):Promise<unknown>{
    if(!context.sessionToken)throw new Error("Sessione Direzione richiesta");
    const bridge=new R20BridgeClient();
    const result=await bridge.call<unknown>(
      "direction.drive.folder.create",
      {path:input.path,purpose:input.purpose||""},
      context.sessionToken
    );
    await context.events.publish({
      type:"lia.drive_folder.created",
      tenantId:context.tenantId,
      correlationId:context.correlationId,
      actorId:context.actor.userId,
      occurredAt:new Date().toISOString(),
      payload:{path:input.path}
    });
    return result;
  }
}

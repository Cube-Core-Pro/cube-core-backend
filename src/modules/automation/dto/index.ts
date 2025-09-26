// path: backend/src/modules/automation/dto/index.ts
// purpose: Export all automation DTOs
// dependencies: All DTO files

export { AutomationQueryDto } from './automation-query.dto';
export { CreateWorkflowDto, WorkflowTriggerDto, WorkflowStepDto, WorkflowVariableDto } from './create-workflow.dto';
export { UpdateWorkflowDto } from './update-workflow.dto';
export { CreateBusinessProcessDto, ProcessStageDto, ProcessSLADto, ProcessParticipantDto } from './create-business-process.dto';
export { UpdateBusinessProcessDto } from './update-business-process.dto';
export { CreateTaskDto } from './create-task.dto';
export { UpdateTaskDto } from './update-task.dto';
export { CreateRuleDto, RuleConditionDto, RuleActionDto } from './create-rule.dto';
export { UpdateRuleDto } from './update-rule.dto';
export { CreateIntegrationDto, IntegrationEndpointDto, IntegrationAuthDto, IntegrationMappingDto } from './create-integration.dto';
export { UpdateIntegrationDto } from './update-integration.dto';
"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecWsStack = void 0;
const path = require("path");
const seedrandom = require("seedrandom");
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const IotPolicy_1 = require("./IotPolicy/IotPolicy");
const IotThingGroup_1 = require("../../../base/cdk/lib/IotThingGroup/IotThingGroup");
const GreengrassV2Component_1 = require("../../../base/cdk/lib/GreengrassV2Component/GreengrassV2Component");
const GreengrassV2Deployment_1 = require("../../../base/cdk/lib/GreengrassV2Deployment/GreengrassV2Deployment");
const myConst = require("./Constants");
class SecWsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        if (cdk.Stack.of(this).stackName.length > 20) {
            console.error("Stack name must be less than 20 characters in length");
            process.exitCode = 1;
        }
        const parentStack = this.node.tryGetContext("baseStack");
        if (parentStack === undefined) {
            console.error('Parent stack must be provided with --context baseStack="gg-accel-base" argument for "cdk deploy" or "cdk destroy"');
            process.exitCode = 1;
        }
        // suffix to use for all stack resources to make unique
        // In this stack all resources will use the format STACKNAME-RESOURCENAME-RANDOMSUFFIX
        const stackRandom = makeid(8, parentStack);
        // Load parameters from parent stack
        const thingArn = cdk.Fn.importValue(`${parentStack}-ThingArn`);
        const thingName = cdk.Fn.importValue(`${parentStack}-ThingName`);
        const certificateArn = cdk.Fn.importValue(`${parentStack}-CertificateArn`);
        const iamRoleArn = cdk.Fn.importValue(`${parentStack}-IamRoleArn`);
        const componentBucketArn = cdk.Fn.importValue(`${parentStack}-ComponentBucketArn`);
        // Layered constructs - each constructs derived values can be used for subsequent constructs
        // Create IoT policy and attach to certificate
        const secWsPolicyName = fullResourceName({
            stackName: cdk.Stack.of(this).stackName,
            baseName: "gg-accel-sec-ws",
            suffix: stackRandom,
            resourceRegex: "\\w+=,.@-",
            maxLength: 128
        });
        const iotPolicy = new IotPolicy_1.IotPolicy(this, "SecWsIotPolicy", {
            iotPolicyName: secWsPolicyName,
            iotPolicy: myConst.secWsIoTPolicy,
            certificateArn: certificateArn,
            policyParameterMapping: {
                thingname: thingName,
                region: cdk.Fn.ref("AWS::Region"),
                account: cdk.Fn.ref("AWS::AccountId")
            }
        });
        // Add an inline policy to the IAM role used by the IoT role alias
        const secWsInlinePolicy = new aws_cdk_lib_1.aws_iam.Policy(this, "SecWsPolicy", {
            policyName: "secWsAccelerator",
            statements: [
                new aws_cdk_lib_1.aws_iam.PolicyStatement({
                    effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
                    actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
                    resources: ["arn:aws:logs:*:*:*"]
                })
            ]
        });
        const sourceRole = aws_cdk_lib_1.aws_iam.Role.fromRoleArn(this, "BaseRole", iamRoleArn, {
            mutable: true
        });
        sourceRole.attachInlinePolicy(secWsInlinePolicy);
        // Define stack-specific name of the IoT thing group
        const groupName = fullResourceName({
            stackName: cdk.Stack.of(this).stackName,
            baseName: "deployment-group",
            suffix: stackRandom,
            resourceRegex: "a-zA-Z0-9:_-",
            maxLength: 128
        });
        // Create thing group as deployment target and add the thing
        const deploymentGroup = new IotThingGroup_1.IotThingGroup(this, "DeploymentGroup", {
            thingGroupName: groupName
        });
        deploymentGroup.addThing(thingArn);
        // Create component(s) for accelerator
        // Reference the base stack's component bucket
        const componentBucket = aws_cdk_lib_2.aws_s3.Bucket.fromBucketArn(this, "ComponentBucket", componentBucketArn);
        // Create Sec Workshop component
        // uses same component file name and path as AWS published components,
        // see the source recipe file for more details
        const componentName = "ggAccel.sec_ws";
        const componentVersion = "1.0.0";
        const secWsComponent = new GreengrassV2Component_1.GreengrassV2Component(this, "secWsComponent", {
            componentName: componentName,
            componentVersion: componentVersion,
            bucket: componentBucket,
            artifactZipPrefix: `${componentName}/${componentVersion}/`,
            targetArtifactKeyName: `${componentName}.zip`,
            sourceArtifactPath: path.join(__dirname, "..", "components", componentName, "artifacts", componentName, componentVersion),
            sourceRecipeFile: path.join(__dirname, "..", "components", componentName, `${componentName}-${componentVersion}.yaml`)
        });
        // create deployment -- cancel deployment
        const greengrassDeployment = new GreengrassV2Deployment_1.GreengrassV2Deployment(this, "SecWsGreengrassDeployment", {
            targetArn: deploymentGroup.thingGroupArn,
            deploymentName: `${this.stackName} - operating system sec workshop deployment`,
            component: {
                // accelerator component(s)
                [secWsComponent.componentName]: {
                    componentVersion: secWsComponent.componentVersion
                    // configurationUpdate: {
                    //   merge: JSON.stringify({
                    //     Message: "Welcome from the Greengrass accelerator stack"
                    //   })
                    // }
                }
            }
        });
        // Set stack outputs to be consumed by local processes
        new cdk.CfnOutput(this, "RequestTopic", {
            value: `${thingName}/sec_ws/request`
        });
        new cdk.CfnOutput(this, "ResponseTopic", {
            value: `${thingName}/sec_ws/response`
        });
        // ************ End of CDK Constructs / stack - Supporting functions below ************
        function makeid(length, seed) {
            // Generate a n-length random value for each resource
            var result = "";
            var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var charactersLength = characters.length;
            seedrandom(seed, { global: true });
            for (var i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }
        function fullResourceName({ stackName, baseName, suffix, resourceRegex, maxLength }) {
            let re = new RegExp(`[^\\[${resourceRegex}]`, "g");
            let resourceName = `${stackName}-${baseName}`.replace(re, "");
            resourceName = resourceName.substring(0, maxLength - suffix.length - 1);
            resourceName = `${resourceName}-${suffix}`;
            return resourceName;
        }
    }
}
exports.SecWsStack = SecWsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VjV3NTdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlNlY1dzU3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTtBQUNyRSxpQ0FBaUM7OztBQUVqQyw2QkFBNEI7QUFDNUIseUNBQXdDO0FBRXhDLG1DQUFrQztBQUNsQyw2Q0FBMEM7QUFDMUMsNkNBQXdDO0FBQ3hDLHFEQUFpRDtBQUNqRCxxRkFBaUY7QUFDakYsNkdBQXlHO0FBQ3pHLGdIQUE0RztBQUU1Ryx1Q0FBc0M7QUFFdEMsTUFBYSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFO1lBQzVDLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQTtZQUNyRSxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtTQUNyQjtRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtZQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLG1IQUFtSCxDQUFDLENBQUE7WUFDbEksT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7U0FDckI7UUFFRCx1REFBdUQ7UUFDdkQsc0ZBQXNGO1FBQ3RGLE1BQU0sV0FBVyxHQUFXLE1BQU0sQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFbEQsb0NBQW9DO1FBQ3BDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVyxXQUFXLENB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WUFBWSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3ZFLFlBQVksR0FBRyxHQUFHLFlBQVksSUFBSSxNQUFNLEVBQUUsQ0FBQTtZQUMxQyxPQUFPLFlBQVksQ0FBQTtRQUNyQixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBdEpELGdDQXNKQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIlxuaW1wb3J0ICogYXMgc2VlZHJhbmRvbSBmcm9tIFwic2VlZHJhbmRvbVwiXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQge2F3c19pYW0gYXMgaWFtfSBmcm9tIFwiYXdzLWNkay1saWJcIlxuaW1wb3J0IHthd3NfczMgYXMgczN9IGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQgeyBJb3RQb2xpY3kgfSBmcm9tIFwiLi9Jb3RQb2xpY3kvSW90UG9saWN5XCJcbmltcG9ydCB7IElvdFRoaW5nR3JvdXAgfSBmcm9tIFwiLi4vLi4vLi4vYmFzZS9jZGsvbGliL0lvdFRoaW5nR3JvdXAvSW90VGhpbmdHcm91cFwiXG5pbXBvcnQgeyBHcmVlbmdyYXNzVjJDb21wb25lbnQgfSBmcm9tIFwiLi4vLi4vLi4vYmFzZS9jZGsvbGliL0dyZWVuZ3Jhc3NWMkNvbXBvbmVudC9HcmVlbmdyYXNzVjJDb21wb25lbnRcIlxuaW1wb3J0IHsgR3JlZW5ncmFzc1YyRGVwbG95bWVudCB9IGZyb20gXCIuLi8uLi8uLi9iYXNlL2Nkay9saWIvR3JlZW5ncmFzc1YyRGVwbG95bWVudC9HcmVlbmdyYXNzVjJEZXBsb3ltZW50XCJcblxuaW1wb3J0ICogYXMgbXlDb25zdCBmcm9tIFwiLi9Db25zdGFudHNcIlxuXG5leHBvcnQgY2xhc3MgU2VjV3NTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgaWYgKGNkay5TdGFjay5vZih0aGlzKS5zdGFja05hbWUubGVuZ3RoID4gMjApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTdGFjayBuYW1lIG11c3QgYmUgbGVzcyB0aGFuIDIwIGNoYXJhY3RlcnMgaW4gbGVuZ3RoXCIpXG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMVxuICAgIH1cbiAgICBjb25zdCBwYXJlbnRTdGFjayA9IHRoaXMubm9kZS50cnlHZXRDb250ZXh0KFwiYmFzZVN0YWNrXCIpXG4gICAgaWYgKHBhcmVudFN0YWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BhcmVudCBzdGFjayBtdXN0IGJlIHByb3ZpZGVkIHdpdGggLS1jb250ZXh0IGJhc2VTdGFjaz1cImdnLWFjY2VsLWJhc2VcIiBhcmd1bWVudCBmb3IgXCJjZGsgZGVwbG95XCIgb3IgXCJjZGsgZGVzdHJveVwiJylcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxXG4gICAgfVxuXG4gICAgLy8gc3VmZml4IHRvIHVzZSBmb3IgYWxsIHN0YWNrIHJlc291cmNlcyB0byBtYWtlIHVuaXF1ZVxuICAgIC8vIEluIHRoaXMgc3RhY2sgYWxsIHJlc291cmNlcyB3aWxsIHVzZSB0aGUgZm9ybWF0IFNUQUNLTkFNRS1SRVNPVVJDRU5BTUUtUkFORE9NU1VGRklYXG4gICAgY29uc3Qgc3RhY2tSYW5kb206IHN0cmluZyA9IG1ha2VpZCg4LCBwYXJlbnRTdGFjaylcblxuICAgIC8vIExvYWQgcGFyYW1ldGVycyBmcm9tIHBhcmVudCBzdGFja1xuICAgIGNvbnN0IHRoaW5nQXJuID0gY2RrLkZuLmltcG9ydFZhbHVlKGAke3BhcmVudFN0YWNrfS1UaGluZ0FybmApXG4gICAgY29uc3QgdGhpbmdOYW1lID0gY2RrLkZuLmltcG9ydFZhbHVlKGAke3BhcmVudFN0YWNrfS1UaGluZ05hbWVgKVxuICAgIGNvbnN0IGNlcnRpZmljYXRlQXJuID0gY2RrLkZuLmltcG9ydFZhbHVlKGAke3BhcmVudFN0YWNrfS1DZXJ0aWZpY2F0ZUFybmApXG4gICAgY29uc3QgaWFtUm9sZUFybiA9IGNkay5Gbi5pbXBvcnRWYWx1ZShgJHtwYXJlbnRTdGFja30tSWFtUm9sZUFybmApXG4gICAgY29uc3QgY29tcG9uZW50QnVja2V0QXJuID0gY2RrLkZuLmltcG9ydFZhbHVlKGAke3BhcmVudFN0YWNrfS1Db21wb25lbnRCdWNrZXRBcm5gKVxuXG4gICAgLy8gTGF5ZXJlZCBjb25zdHJ1Y3RzIC0gZWFjaCBjb25zdHJ1Y3RzIGRlcml2ZWQgdmFsdWVzIGNhbiBiZSB1c2VkIGZvciBzdWJzZXF1ZW50IGNvbnN0cnVjdHNcblxuICAgIC8vIENyZWF0ZSBJb1QgcG9saWN5IGFuZCBhdHRhY2ggdG8gY2VydGlmaWNhdGVcbiAgICBjb25zdCBzZWNXc1BvbGljeU5hbWUgPSBmdWxsUmVzb3VyY2VOYW1lKHtcbiAgICAgIHN0YWNrTmFtZTogY2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZSxcbiAgICAgIGJhc2VOYW1lOiBcImdnLWFjY2VsLXNlYy13c1wiLFxuICAgICAgc3VmZml4OiBzdGFja1JhbmRvbSxcbiAgICAgIHJlc291cmNlUmVnZXg6IFwiXFxcXHcrPSwuQC1cIixcbiAgICAgIG1heExlbmd0aDogMTI4XG4gICAgfSlcbiAgICBjb25zdCBpb3RQb2xpY3kgPSBuZXcgSW90UG9saWN5KHRoaXMsIFwiU2VjV3NJb3RQb2xpY3lcIiwge1xuICAgICAgaW90UG9saWN5TmFtZTogc2VjV3NQb2xpY3lOYW1lLFxuICAgICAgaW90UG9saWN5OiBteUNvbnN0LnNlY1dzSW9UUG9saWN5LFxuICAgICAgY2VydGlmaWNhdGVBcm46IGNlcnRpZmljYXRlQXJuLFxuICAgICAgcG9saWN5UGFyYW1ldGVyTWFwcGluZzoge1xuICAgICAgICB0aGluZ25hbWU6IHRoaW5nTmFtZSxcbiAgICAgICAgcmVnaW9uOiBjZGsuRm4ucmVmKFwiQVdTOjpSZWdpb25cIiksXG4gICAgICAgIGFjY291bnQ6IGNkay5Gbi5yZWYoXCJBV1M6OkFjY291bnRJZFwiKVxuICAgICAgfVxuICAgIH0pXG4gICAgLy8gQWRkIGFuIGlubGluZSBwb2xpY3kgdG8gdGhlIElBTSByb2xlIHVzZWQgYnkgdGhlIElvVCByb2xlIGFsaWFzXG4gICAgY29uc3Qgc2VjV3NJbmxpbmVQb2xpY3kgPSBuZXcgaWFtLlBvbGljeSh0aGlzLCBcIlNlY1dzUG9saWN5XCIsIHtcbiAgICAgIHBvbGljeU5hbWU6IFwic2VjV3NBY2NlbGVyYXRvclwiLFxuICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIiwgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLCBcImxvZ3M6UHV0TG9nRXZlbnRzXCIsIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIl0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCJhcm46YXdzOmxvZ3M6KjoqOipcIl1cbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9KVxuICAgIGNvbnN0IHNvdXJjZVJvbGUgPSBpYW0uUm9sZS5mcm9tUm9sZUFybih0aGlzLCBcIkJhc2VSb2xlXCIsIGlhbVJvbGVBcm4sIHtcbiAgICAgIG11dGFibGU6IHRydWVcbiAgICB9KVxuICAgIHNvdXJjZVJvbGUuYXR0YWNoSW5saW5lUG9saWN5KHNlY1dzSW5saW5lUG9saWN5KVxuXG4gICAgLy8gRGVmaW5lIHN0YWNrLXNwZWNpZmljIG5hbWUgb2YgdGhlIElvVCB0aGluZyBncm91cFxuICAgIGNvbnN0IGdyb3VwTmFtZSA9IGZ1bGxSZXNvdXJjZU5hbWUoe1xuICAgICAgc3RhY2tOYW1lOiBjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lLFxuICAgICAgYmFzZU5hbWU6IFwiZGVwbG95bWVudC1ncm91cFwiLFxuICAgICAgc3VmZml4OiBzdGFja1JhbmRvbSxcbiAgICAgIHJlc291cmNlUmVnZXg6IFwiYS16QS1aMC05Ol8tXCIsXG4gICAgICBtYXhMZW5ndGg6IDEyOFxuICAgIH0pXG4gICAgLy8gQ3JlYXRlIHRoaW5nIGdyb3VwIGFzIGRlcGxveW1lbnQgdGFyZ2V0IGFuZCBhZGQgdGhlIHRoaW5nXG4gICAgY29uc3QgZGVwbG95bWVudEdyb3VwID0gbmV3IElvdFRoaW5nR3JvdXAodGhpcywgXCJEZXBsb3ltZW50R3JvdXBcIiwge1xuICAgICAgdGhpbmdHcm91cE5hbWU6IGdyb3VwTmFtZVxuICAgIH0pXG4gICAgZGVwbG95bWVudEdyb3VwLmFkZFRoaW5nKHRoaW5nQXJuKVxuXG4gICAgLy8gQ3JlYXRlIGNvbXBvbmVudChzKSBmb3IgYWNjZWxlcmF0b3JcblxuICAgIC8vIFJlZmVyZW5jZSB0aGUgYmFzZSBzdGFjaydzIGNvbXBvbmVudCBidWNrZXRcbiAgICBjb25zdCBjb21wb25lbnRCdWNrZXQgPSBzMy5CdWNrZXQuZnJvbUJ1Y2tldEFybih0aGlzLCBcIkNvbXBvbmVudEJ1Y2tldFwiLCBjb21wb25lbnRCdWNrZXRBcm4pXG5cbiAgICAvLyBDcmVhdGUgU2VjIFdvcmtzaG9wIGNvbXBvbmVudFxuICAgIC8vIHVzZXMgc2FtZSBjb21wb25lbnQgZmlsZSBuYW1lIGFuZCBwYXRoIGFzIEFXUyBwdWJsaXNoZWQgY29tcG9uZW50cyxcbiAgICAvLyBzZWUgdGhlIHNvdXJjZSByZWNpcGUgZmlsZSBmb3IgbW9yZSBkZXRhaWxzXG4gICAgY29uc3QgY29tcG9uZW50TmFtZSA9IFwiZ2dBY2NlbC5zZWNfd3NcIlxuICAgIGNvbnN0IGNvbXBvbmVudFZlcnNpb24gPSBcIjEuMC4wXCJcbiAgICBjb25zdCBzZWNXc0NvbXBvbmVudCA9IG5ldyBHcmVlbmdyYXNzVjJDb21wb25lbnQodGhpcywgXCJzZWNXc0NvbXBvbmVudFwiLCB7XG4gICAgICBjb21wb25lbnROYW1lOiBjb21wb25lbnROYW1lLFxuICAgICAgY29tcG9uZW50VmVyc2lvbjogY29tcG9uZW50VmVyc2lvbixcbiAgICAgIGJ1Y2tldDogY29tcG9uZW50QnVja2V0LFxuICAgICAgYXJ0aWZhY3RaaXBQcmVmaXg6IGAke2NvbXBvbmVudE5hbWV9LyR7Y29tcG9uZW50VmVyc2lvbn0vYCxcbiAgICAgIHRhcmdldEFydGlmYWN0S2V5TmFtZTogYCR7Y29tcG9uZW50TmFtZX0uemlwYCxcbiAgICAgIHNvdXJjZUFydGlmYWN0UGF0aDogcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLlwiLCBcImNvbXBvbmVudHNcIiwgY29tcG9uZW50TmFtZSwgXCJhcnRpZmFjdHNcIiwgY29tcG9uZW50TmFtZSwgY29tcG9uZW50VmVyc2lvbiksXG4gICAgICBzb3VyY2VSZWNpcGVGaWxlOiBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uXCIsIFwiY29tcG9uZW50c1wiLCBjb21wb25lbnROYW1lLCBgJHtjb21wb25lbnROYW1lfS0ke2NvbXBvbmVudFZlcnNpb259LnlhbWxgKVxuICAgIH0pXG5cbiAgICAvLyBjcmVhdGUgZGVwbG95bWVudCAtLSBjYW5jZWwgZGVwbG95bWVudFxuICAgIGNvbnN0IGdyZWVuZ3Jhc3NEZXBsb3ltZW50ID0gbmV3IEdyZWVuZ3Jhc3NWMkRlcGxveW1lbnQodGhpcywgXCJTZWNXc0dyZWVuZ3Jhc3NEZXBsb3ltZW50XCIsIHtcbiAgICAgIHRhcmdldEFybjogZGVwbG95bWVudEdyb3VwLnRoaW5nR3JvdXBBcm4sXG4gICAgICBkZXBsb3ltZW50TmFtZTogYCR7dGhpcy5zdGFja05hbWV9IC0gb3BlcmF0aW5nIHN5c3RlbSBzZWMgd29ya3Nob3AgZGVwbG95bWVudGAsXG4gICAgICBjb21wb25lbnQ6IHtcbiAgICAgICAgLy8gYWNjZWxlcmF0b3IgY29tcG9uZW50KHMpXG4gICAgICAgIFtzZWNXc0NvbXBvbmVudC5jb21wb25lbnROYW1lXToge1xuICAgICAgICAgIGNvbXBvbmVudFZlcnNpb246IHNlY1dzQ29tcG9uZW50LmNvbXBvbmVudFZlcnNpb25cbiAgICAgICAgICAvLyBjb25maWd1cmF0aW9uVXBkYXRlOiB7XG4gICAgICAgICAgLy8gICBtZXJnZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIC8vICAgICBNZXNzYWdlOiBcIldlbGNvbWUgZnJvbSB0aGUgR3JlZW5ncmFzcyBhY2NlbGVyYXRvciBzdGFja1wiXG4gICAgICAgICAgLy8gICB9KVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBTZXQgc3RhY2sgb3V0cHV0cyB0byBiZSBjb25zdW1lZCBieSBsb2NhbCBwcm9jZXNzZXNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlJlcXVlc3RUb3BpY1wiLCB7XG4gICAgICB2YWx1ZTogYCR7dGhpbmdOYW1lfS9zZWNfd3MvcmVxdWVzdGBcbiAgICB9KVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiUmVzcG9uc2VUb3BpY1wiLCB7XG4gICAgICB2YWx1ZTogYCR7dGhpbmdOYW1lfS9zZWNfd3MvcmVzcG9uc2VgXG4gICAgfSlcblxuICAgIC8vICoqKioqKioqKioqKiBFbmQgb2YgQ0RLIENvbnN0cnVjdHMgLyBzdGFjayAtIFN1cHBvcnRpbmcgZnVuY3Rpb25zIGJlbG93ICoqKioqKioqKioqKlxuXG4gICAgZnVuY3Rpb24gbWFrZWlkKGxlbmd0aDogbnVtYmVyLCBzZWVkOiBzdHJpbmcpIHtcbiAgICAgIC8vIEdlbmVyYXRlIGEgbi1sZW5ndGggcmFuZG9tIHZhbHVlIGZvciBlYWNoIHJlc291cmNlXG4gICAgICB2YXIgcmVzdWx0ID0gXCJcIlxuICAgICAgdmFyIGNoYXJhY3RlcnMgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5XCJcbiAgICAgIHZhciBjaGFyYWN0ZXJzTGVuZ3RoID0gY2hhcmFjdGVycy5sZW5ndGhcbiAgICAgIHNlZWRyYW5kb20oc2VlZCwgeyBnbG9iYWw6IHRydWUgfSlcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0ICs9IGNoYXJhY3RlcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNMZW5ndGgpKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIGludGVyZmFjZSBSZXNvdXJjZU5hbWUge1xuICAgICAgc3RhY2tOYW1lOiBzdHJpbmdcbiAgICAgIGJhc2VOYW1lOiBzdHJpbmdcbiAgICAgIHN1ZmZpeDogc3RyaW5nXG4gICAgICByZXNvdXJjZVJlZ2V4OiBzdHJpbmdcbiAgICAgIG1heExlbmd0aDogbnVtYmVyXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnVsbFJlc291cmNlTmFtZSh7IHN0YWNrTmFtZSwgYmFzZU5hbWUsIHN1ZmZpeCwgcmVzb3VyY2VSZWdleCwgbWF4TGVuZ3RoIH06IFJlc291cmNlTmFtZSkge1xuICAgICAgbGV0IHJlID0gbmV3IFJlZ0V4cChgW15cXFxcWyR7cmVzb3VyY2VSZWdleH1dYCwgXCJnXCIpXG4gICAgICBsZXQgcmVzb3VyY2VOYW1lID0gYCR7c3RhY2tOYW1lfS0ke2Jhc2VOYW1lfWAucmVwbGFjZShyZSwgXCJcIilcbiAgICAgIHJlc291cmNlTmFtZSA9IHJlc291cmNlTmFtZS5zdWJzdHJpbmcoMCwgbWF4TGVuZ3RoIC0gc3VmZml4Lmxlbmd0aCAtIDEpXG4gICAgICByZXNvdXJjZU5hbWUgPSBgJHtyZXNvdXJjZU5hbWV9LSR7c3VmZml4fWBcbiAgICAgIHJldHVybiByZXNvdXJjZU5hbWVcbiAgICB9XG4gIH1cbn1cbiJdfQ==
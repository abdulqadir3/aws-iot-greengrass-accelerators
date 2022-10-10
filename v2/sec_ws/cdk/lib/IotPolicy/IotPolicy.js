"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotPolicy = void 0;
const _ = require("lodash");
const path = require("path");
const constructs_1 = require("constructs");
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const cr = require("aws-cdk-lib/custom-resources");
const lambda = require("aws-cdk-lib/aws-lambda");
/**
 * This construct creates an IoT policy and optionally attaches it to
 * an existing IoT certificate principal.
 *
 * @summary Creates an AWS IoT policy and optionally attached it to a certificate.
 *
 */
/**
 * @ summary The IotThingCertPolicy class.
 */
class IotPolicy extends constructs_1.Construct {
    /**
     * @summary Constructs a new instance of the IotPolicy class.
     * @param {cdp.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a scope-unique id.
     * @param {IotPolicyProps} props - user provided props for the construct.
     * @since 1.116.0
     */
    constructor(scope, id, props) {
        var _a, _b;
        super(scope, id);
        this.customResourceName = "IotPolicyFunction";
        const stackName = cdk.Stack.of(this).stackName;
        // Validate and derive final values for resources
        // For the AWS Core policy, the template maps replacements from the
        // props.policyParameterMapping along with the following provided variables:
        var policyTemplate = _.template(props.iotPolicy);
        var iotPolicy = policyTemplate(props.policyParameterMapping);
        const provider = IotPolicy.getOrCreateProvider(this, this.customResourceName);
        const customResource = new cdk.CustomResource(this, this.customResourceName, {
            serviceToken: provider.serviceToken,
            properties: {
                StackName: stackName,
                IotPolicy: iotPolicy,
                IoTPolicyName: props.iotPolicyName,
                CertificateArn: props.certificateArn
            }
        });
        // Custom resource Lambda role permissions
        // Create and delete specific policy
        (_a = provider.onEventHandler.role) === null || _a === void 0 ? void 0 : _a.addToPrincipalPolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            actions: ["iot:CreatePolicy", "iot:DeletePolicy", "iot:DeletePolicyVersion", "iot:ListPolicyVersions", "iot:ListTargetsForPolicy"],
            resources: [
                `arn:${cdk.Fn.ref("AWS::Partition")}:iot:${cdk.Fn.ref("AWS::Region")}:${cdk.Fn.ref("AWS::AccountId")}:policy/${props.iotPolicyName}`
            ]
        }));
        // Actions without resource types
        (_b = provider.onEventHandler.role) === null || _b === void 0 ? void 0 : _b.addToPrincipalPolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            actions: ["iot:AttachPolicy", "iot:DetachPolicy", "iot:ListAttachedPolicies", "iot:UpdateCertificate"],
            resources: ["*"]
        }));
        // class public values
        this.iotPolicyArn = customResource.getAttString("IotPolicyArn");
    }
}
exports.IotPolicy = IotPolicy;
// Separate static function to create or return singleton provider
IotPolicy.getOrCreateProvider = (scope, resourceName) => {
    const stack = cdk.Stack.of(scope);
    const uniqueId = resourceName;
    const existing = stack.node.tryFindChild(uniqueId);
    if (existing === undefined) {
        const createThingFn = new lambda.Function(stack, `${uniqueId}-Provider`, {
            handler: "iot_policy.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "assets")),
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: cdk.Duration.minutes(1),
            logRetention: aws_cdk_lib_1.aws_logs.RetentionDays.ONE_MONTH
        });
        // Role permissions are handled by the main constructor
        // Create the provider that invokes the Lambda function
        const createThingProvider = new cr.Provider(stack, uniqueId, {
            onEventHandler: createThingFn,
            logRetention: aws_cdk_lib_1.aws_logs.RetentionDays.ONE_DAY
        });
        return createThingProvider;
    }
    else {
        // Second or additional call, use existing provider
        return existing;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW90UG9saWN5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiSW90UG9saWN5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBcUU7QUFDckUsaUNBQWlDOzs7QUFFakMsNEJBQTJCO0FBQzNCLDZCQUE0QjtBQUM1QiwyQ0FBc0M7QUFDdEMsbUNBQWtDO0FBQ2xDLDZDQUE0QztBQUM1Qyw2Q0FBMEM7QUFDMUMsbURBQWtEO0FBQ2xELGlEQUFnRDtBQXVDaEQ7Ozs7OztHQU1HO0FBRUg7O0dBRUc7QUFFSCxNQUFhLFNBQVUsU0FBUSxzQkFBUztJQVV0Qzs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCOztRQUM3RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBVlYsdUJBQWtCLEdBQUcsbUJBQW1CLENBQUE7UUFZOUMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQzlDLGlEQUFpRDtRQUVqRCxtRUFBbUU7UUFDbkUsNEVBQTRFO1FBQzVFLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hELElBQUksU0FBUyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzNFLFlBQVksRUFBRSxRQUFRLENBQUMsWUFBWTtZQUNuQyxVQUFVLEVBQUU7Z0JBQ1YsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7Z0JBQ2xDLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYzthQUNyQztTQUNGLENBQUMsQ0FBQTtRQUVGLDBDQUEwQztRQUMxQyxvQ0FBb0M7UUFDcEMsTUFBQSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksMENBQUUsb0JBQW9CLENBQ2hELElBQUkscUJBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsMEJBQTBCLENBQUM7WUFDbEksU0FBUyxFQUFFO2dCQUNULE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEtBQUssQ0FBQyxhQUFhLEVBQUU7YUFDckk7U0FDRixDQUFDLENBQ0gsQ0FBQTtRQUNELGlDQUFpQztRQUNqQyxNQUFBLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSwwQ0FBRSxvQkFBb0IsQ0FDaEQsSUFBSSxxQkFBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsQ0FBQztZQUN0RyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUNILENBQUE7UUFFRCxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7O0FBM0RILDhCQXdGQztBQTNCQyxrRUFBa0U7QUFDM0QsNkJBQW1CLEdBQUcsQ0FBQyxLQUFnQixFQUFFLFlBQW9CLEVBQWUsRUFBRTtJQUNuRixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUE7SUFDN0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFnQixDQUFBO0lBRWpFLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtRQUMxQixNQUFNLGFBQWEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsUUFBUSxXQUFXLEVBQUU7WUFDdkUsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVTtZQUNsQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksRUFBRSxzQkFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTO1NBQzNDLENBQUMsQ0FBQTtRQUNGLHVEQUF1RDtRQUV2RCx1REFBdUQ7UUFDdkQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRTtZQUMzRCxjQUFjLEVBQUUsYUFBYTtZQUM3QixZQUFZLEVBQUUsc0JBQUksQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUE7UUFDRixPQUFPLG1CQUFtQixDQUFBO0tBQzNCO1NBQU07UUFDTCxtREFBbUQ7UUFDbkQsT0FBTyxRQUFRLENBQUE7S0FDaEI7QUFDSCxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxuXG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIlxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQge2F3c19sb2dzIGFzIGxvZ3N9IGZyb20gXCJhd3MtY2RrLWxpYlwiXG5pbXBvcnQge2F3c19pYW0gYXMgaWFtfSBmcm9tIFwiYXdzLWNkay1saWJcIlxuaW1wb3J0ICogYXMgY3IgZnJvbSBcImF3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXNcIlxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbGFtYmRhXCJcblxuZXhwb3J0IGludGVyZmFjZSBNYXBwaW5nIHtcbiAgW2tleXM6IHN0cmluZ106IHN0cmluZ1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5IFRoZSBwcm9wZXJ0aWVzIGZvciB0aGUgSW90UG9saWN5UHJvcHMgY2xhc3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW90UG9saWN5UHJvcHMge1xuICAvKipcbiAgICogTmFtZSBvZiB0aGUgQVdTIElvVCBDb3JlIHBvbGljeSB0byBjcmVhdGUuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm9uZVxuICAgKi9cbiAgaW90UG9saWN5TmFtZTogc3RyaW5nXG4gIC8qKlxuICAgKiBUaGUgQVdTIElvVCBwb2xpY3kgdG8gYmUgY3JlYXRlZCBhbmQgYXR0YWNoZWQgdG8gdGhlIGNlcnRpZmljYXRlLlxuICAgKiBKU09OIHN0cmluZyBjb252ZXJ0ZWQgdG8gSW9UIHBvbGljeSwgbG9kYXNoIGZvcm1hdCBmb3IgcmVwbGFjZW1lbnQuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm9uZVxuICAgKi9cbiAgaW90UG9saWN5OiBzdHJpbmdcbiAgLyoqXG4gICAqIEFuIG9iamVjdCBvZiBwYXJhbWV0ZXJzIGFuZCB2YWx1ZXMgdG8gYmUgcmVwbGFjZWQgaWYgYSBKaW5qYSB0ZW1wbGF0ZSBpc1xuICAgKiBwcm92aWRlZC4gRm9yIGVhY2ggbWF0Y2hpbmcgcGFyYW1ldGVyIGluIHRoZSBwb2xpY3kgdGVtcGxhdGUsIHRoZSB2YWx1ZVxuICAgKiB3aWxsIGJlIHVzZWQuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm9uZVxuICAgKi9cbiAgcG9saWN5UGFyYW1ldGVyTWFwcGluZz86IG9iamVjdFxuICAvKipcbiAgICogQ2VydGlmaWNhdGUgQXJuIHRvIHdoaWNoIHRvIGF0dGFjaCB0aGUgcG9saWN5XG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm9uZVxuICAgKi9cbiAgY2VydGlmaWNhdGVBcm4/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBUaGlzIGNvbnN0cnVjdCBjcmVhdGVzIGFuIElvVCBwb2xpY3kgYW5kIG9wdGlvbmFsbHkgYXR0YWNoZXMgaXQgdG9cbiAqIGFuIGV4aXN0aW5nIElvVCBjZXJ0aWZpY2F0ZSBwcmluY2lwYWwuXG4gKlxuICogQHN1bW1hcnkgQ3JlYXRlcyBhbiBBV1MgSW9UIHBvbGljeSBhbmQgb3B0aW9uYWxseSBhdHRhY2hlZCBpdCB0byBhIGNlcnRpZmljYXRlLlxuICpcbiAqL1xuXG4vKipcbiAqIEAgc3VtbWFyeSBUaGUgSW90VGhpbmdDZXJ0UG9saWN5IGNsYXNzLlxuICovXG5cbmV4cG9ydCBjbGFzcyBJb3RQb2xpY3kgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdGhpbmdBcm46IHN0cmluZ1xuICBwdWJsaWMgcmVhZG9ubHkgaW90UG9saWN5QXJuOiBzdHJpbmdcbiAgcHVibGljIHJlYWRvbmx5IGNlcnRpZmljYXRlQXJuOiBzdHJpbmdcbiAgcHVibGljIHJlYWRvbmx5IGNlcnRpZmljYXRlUGVtUGFyYW1ldGVyOiBzdHJpbmdcbiAgcHVibGljIHJlYWRvbmx5IHByaXZhdGVLZXlTZWNyZXRQYXJhbWV0ZXI6IHN0cmluZ1xuICBwdWJsaWMgcmVhZG9ubHkgZGF0YUF0c0VuZHBvaW50QWRkcmVzczogc3RyaW5nXG4gIHB1YmxpYyByZWFkb25seSBjcmVkZW50aWFsUHJvdmlkZXJFbmRwb2ludEFkZHJlc3M6IHN0cmluZ1xuICBwcml2YXRlIGN1c3RvbVJlc291cmNlTmFtZSA9IFwiSW90UG9saWN5RnVuY3Rpb25cIlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBJb3RQb2xpY3kgY2xhc3MuXG4gICAqIEBwYXJhbSB7Y2RwLkFwcH0gc2NvcGUgLSByZXByZXNlbnRzIHRoZSBzY29wZSBmb3IgYWxsIHRoZSByZXNvdXJjZXMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIHRoaXMgaXMgYSBzY29wZS11bmlxdWUgaWQuXG4gICAqIEBwYXJhbSB7SW90UG9saWN5UHJvcHN9IHByb3BzIC0gdXNlciBwcm92aWRlZCBwcm9wcyBmb3IgdGhlIGNvbnN0cnVjdC5cbiAgICogQHNpbmNlIDEuMTE2LjBcbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBJb3RQb2xpY3lQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZClcblxuICAgIGNvbnN0IHN0YWNrTmFtZSA9IGNkay5TdGFjay5vZih0aGlzKS5zdGFja05hbWVcbiAgICAvLyBWYWxpZGF0ZSBhbmQgZGVyaXZlIGZpbmFsIHZhbHVlcyBmb3IgcmVzb3VyY2VzXG5cbiAgICAvLyBGb3IgdGhlIEFXUyBDb3JlIHBvbGljeSwgdGhlIHRlbXBsYXRlIG1hcHMgcmVwbGFjZW1lbnRzIGZyb20gdGhlXG4gICAgLy8gcHJvcHMucG9saWN5UGFyYW1ldGVyTWFwcGluZyBhbG9uZyB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvdmlkZWQgdmFyaWFibGVzOlxuICAgIHZhciBwb2xpY3lUZW1wbGF0ZSA9IF8udGVtcGxhdGUocHJvcHMuaW90UG9saWN5KVxuICAgIHZhciBpb3RQb2xpY3kgPSBwb2xpY3lUZW1wbGF0ZShwcm9wcy5wb2xpY3lQYXJhbWV0ZXJNYXBwaW5nKVxuXG4gICAgY29uc3QgcHJvdmlkZXIgPSBJb3RQb2xpY3kuZ2V0T3JDcmVhdGVQcm92aWRlcih0aGlzLCB0aGlzLmN1c3RvbVJlc291cmNlTmFtZSlcbiAgICBjb25zdCBjdXN0b21SZXNvdXJjZSA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgdGhpcy5jdXN0b21SZXNvdXJjZU5hbWUsIHtcbiAgICAgIHNlcnZpY2VUb2tlbjogcHJvdmlkZXIuc2VydmljZVRva2VuLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBTdGFja05hbWU6IHN0YWNrTmFtZSxcbiAgICAgICAgSW90UG9saWN5OiBpb3RQb2xpY3ksXG4gICAgICAgIElvVFBvbGljeU5hbWU6IHByb3BzLmlvdFBvbGljeU5hbWUsXG4gICAgICAgIENlcnRpZmljYXRlQXJuOiBwcm9wcy5jZXJ0aWZpY2F0ZUFyblxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBDdXN0b20gcmVzb3VyY2UgTGFtYmRhIHJvbGUgcGVybWlzc2lvbnNcbiAgICAvLyBDcmVhdGUgYW5kIGRlbGV0ZSBzcGVjaWZpYyBwb2xpY3lcbiAgICBwcm92aWRlci5vbkV2ZW50SGFuZGxlci5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wiaW90OkNyZWF0ZVBvbGljeVwiLCBcImlvdDpEZWxldGVQb2xpY3lcIiwgXCJpb3Q6RGVsZXRlUG9saWN5VmVyc2lvblwiLCBcImlvdDpMaXN0UG9saWN5VmVyc2lvbnNcIiwgXCJpb3Q6TGlzdFRhcmdldHNGb3JQb2xpY3lcIl0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46JHtjZGsuRm4ucmVmKFwiQVdTOjpQYXJ0aXRpb25cIil9OmlvdDoke2Nkay5Gbi5yZWYoXCJBV1M6OlJlZ2lvblwiKX06JHtjZGsuRm4ucmVmKFwiQVdTOjpBY2NvdW50SWRcIil9OnBvbGljeS8ke3Byb3BzLmlvdFBvbGljeU5hbWV9YFxuICAgICAgICBdXG4gICAgICB9KVxuICAgIClcbiAgICAvLyBBY3Rpb25zIHdpdGhvdXQgcmVzb3VyY2UgdHlwZXNcbiAgICBwcm92aWRlci5vbkV2ZW50SGFuZGxlci5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wiaW90OkF0dGFjaFBvbGljeVwiLCBcImlvdDpEZXRhY2hQb2xpY3lcIiwgXCJpb3Q6TGlzdEF0dGFjaGVkUG9saWNpZXNcIiwgXCJpb3Q6VXBkYXRlQ2VydGlmaWNhdGVcIl0sXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXVxuICAgICAgfSlcbiAgICApXG5cbiAgICAvLyBjbGFzcyBwdWJsaWMgdmFsdWVzXG4gICAgdGhpcy5pb3RQb2xpY3lBcm4gPSBjdXN0b21SZXNvdXJjZS5nZXRBdHRTdHJpbmcoXCJJb3RQb2xpY3lBcm5cIilcbiAgfVxuXG4gIC8vIFNlcGFyYXRlIHN0YXRpYyBmdW5jdGlvbiB0byBjcmVhdGUgb3IgcmV0dXJuIHNpbmdsZXRvbiBwcm92aWRlclxuICBzdGF0aWMgZ2V0T3JDcmVhdGVQcm92aWRlciA9IChzY29wZTogQ29uc3RydWN0LCByZXNvdXJjZU5hbWU6IHN0cmluZyk6IGNyLlByb3ZpZGVyID0+IHtcbiAgICBjb25zdCBzdGFjayA9IGNkay5TdGFjay5vZihzY29wZSlcbiAgICBjb25zdCB1bmlxdWVJZCA9IHJlc291cmNlTmFtZVxuICAgIGNvbnN0IGV4aXN0aW5nID0gc3RhY2subm9kZS50cnlGaW5kQ2hpbGQodW5pcXVlSWQpIGFzIGNyLlByb3ZpZGVyXG5cbiAgICBpZiAoZXhpc3RpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY3JlYXRlVGhpbmdGbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc3RhY2ssIGAke3VuaXF1ZUlkfS1Qcm92aWRlcmAsIHtcbiAgICAgICAgaGFuZGxlcjogXCJpb3RfcG9saWN5LmhhbmRsZXJcIixcbiAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiYXNzZXRzXCIpKSxcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfOCxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USFxuICAgICAgfSlcbiAgICAgIC8vIFJvbGUgcGVybWlzc2lvbnMgYXJlIGhhbmRsZWQgYnkgdGhlIG1haW4gY29uc3RydWN0b3JcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBwcm92aWRlciB0aGF0IGludm9rZXMgdGhlIExhbWJkYSBmdW5jdGlvblxuICAgICAgY29uc3QgY3JlYXRlVGhpbmdQcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcihzdGFjaywgdW5pcXVlSWQsIHtcbiAgICAgICAgb25FdmVudEhhbmRsZXI6IGNyZWF0ZVRoaW5nRm4sXG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9EQVlcbiAgICAgIH0pXG4gICAgICByZXR1cm4gY3JlYXRlVGhpbmdQcm92aWRlclxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZWNvbmQgb3IgYWRkaXRpb25hbCBjYWxsLCB1c2UgZXhpc3RpbmcgcHJvdmlkZXJcbiAgICAgIHJldHVybiBleGlzdGluZ1xuICAgIH1cbiAgfVxufVxuIl19
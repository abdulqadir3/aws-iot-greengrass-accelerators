// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as path from "path"
import * as seedrandom from "seedrandom"
import { Construct } from 'constructs'
import * as cdk from "aws-cdk-lib"
import {aws_iam as iam} from "aws-cdk-lib"
import {aws_s3 as s3} from "aws-cdk-lib"
import { IotPolicy } from "./IotPolicy/IotPolicy"
import { IotThingGroup } from "../../../base/cdk/lib/IotThingGroup/IotThingGroup"
import { GreengrassV2Component } from "../../../base/cdk/lib/GreengrassV2Component/GreengrassV2Component"
import { GreengrassV2Deployment } from "../../../base/cdk/lib/GreengrassV2Deployment/GreengrassV2Deployment"
import * as sitewise from 'aws-cdk-lib/aws-iotsitewise';

import * as myConst from "./Constants"

export class SecWsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    if (cdk.Stack.of(this).stackName.length > 20) {
      console.error("Stack name must be less than 20 characters in length")
      process.exitCode = 1
    }
    const parentStack = this.node.tryGetContext("baseStack")
    if (parentStack === undefined) {
      console.error('Parent stack must be provided with --context baseStack="gg-accel-base" argument for "cdk deploy" or "cdk destroy"')
      process.exitCode = 1
    }

    // suffix to use for all stack resources to make unique
    // In this stack all resources will use the format STACKNAME-RESOURCENAME-RANDOMSUFFIX
    const stackRandom: string = makeid(8, parentStack)
    
    const IgnitionOpcUaEndpoint = "opc.tcp://35.174.109.17:62541/discovery"

    // Load parameters from parent stack
    const thingArn = cdk.Fn.importValue(`${parentStack}-ThingArn`)
    const thingName = cdk.Fn.importValue(`${parentStack}-ThingName`)
    const certificateArn = cdk.Fn.importValue(`${parentStack}-CertificateArn`)
    const iamRoleArn = cdk.Fn.importValue(`${parentStack}-IamRoleArn`)
    const componentBucketArn = cdk.Fn.importValue(`${parentStack}-ComponentBucketArn`)

    // Layered constructs - each constructs derived values can be used for subsequent constructs

    // Create IoT policy and attach to certificate
    const secWsPolicyName = fullResourceName({
      stackName: cdk.Stack.of(this).stackName,
      baseName: "gg-accel-sec-ws",
      suffix: stackRandom,
      resourceRegex: "\\w+=,.@-",
      maxLength: 128
    })
    
    // Create IoT role alias for use by Greengrass core
    const greengrassRoleMinimalPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "iotsitewise:BatchPutAssetPropertyValue"
          ],
          resources: ["*"]
        })
      ]
    })
    
    const iotPolicy = new IotPolicy(this, "SecWsIotPolicy", {
      iotPolicyName: secWsPolicyName,
      iotPolicy: myConst.secWsIoTPolicy,
      certificateArn: certificateArn,
      policyParameterMapping: {
        thingname: thingName,
        region: cdk.Fn.ref("AWS::Region"),
        account: cdk.Fn.ref("AWS::AccountId")
      }
    })
    // Add an inline policy to the IAM role used by the IoT role alias
    const secWsInlinePolicy = new iam.Policy(this, "SecWsPolicy", {
      policyName: "secWsAccelerator",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
          resources: ["arn:aws:logs:*:*:*"]
        })
      ]
    })
    const sourceRole = iam.Role.fromRoleArn(this, "BaseRole", iamRoleArn, {
      mutable: true
    })
    sourceRole.attachInlinePolicy(secWsInlinePolicy)

    // Define stack-specific name of the IoT thing group
    const groupName = fullResourceName({
      stackName: cdk.Stack.of(this).stackName,
      baseName: "deployment-group",
      suffix: stackRandom,
      resourceRegex: "a-zA-Z0-9:_-",
      maxLength: 128
    })
    // Create thing group as deployment target and add the thing
    const deploymentGroup = new IotThingGroup(this, "DeploymentGroup", {
      thingGroupName: groupName
    })
    deploymentGroup.addThing(thingArn)

    // Create component(s) for accelerator

    // Reference the base stack's component bucket
    const componentBucket = s3.Bucket.fromBucketArn(this, "ComponentBucket", componentBucketArn)

    // Create Sec Workshop component
    // uses same component file name and path as AWS published components,
    // see the source recipe file for more details
    const componentName = "ggAccel.sec_ws"
    const componentVersion = "1.0.0"
    const secWsComponent = new GreengrassV2Component(this, "secWsComponent", {
      componentName: componentName,
      componentVersion: componentVersion,
      bucket: componentBucket,
      artifactZipPrefix: `${componentName}/${componentVersion}/`,
      targetArtifactKeyName: `${componentName}.zip`,
      sourceArtifactPath: path.join(__dirname, "..", "components", componentName, "artifacts", componentName, componentVersion),
      sourceRecipeFile: path.join(__dirname, "..", "components", componentName, `${componentName}-${componentVersion}.yaml`)
    })

    // create deployment -- cancel deployment
    const greengrassDeployment = new GreengrassV2Deployment(this, "SecWsGreengrassDeployment", {
      targetArn: deploymentGroup.thingGroupArn,
      deploymentName: `${this.stackName} - operating system sec workshop deployment`,
      component: {
        // accelerator component(s)
        [secWsComponent.componentName]: {
          componentVersion: secWsComponent.componentVersion,
          configurationUpdate: {
            merge: JSON.stringify({
              Message: "Welcome from the Greengrass accelerator stack"
            })
          }
        }
      }
    })
    
        // Add core public components
    greengrassDeployment.addComponent({
      "aws.greengrass.Nucleus": {
        componentVersion: "2.5.5"
      },
      "aws.greengrass.Cli": {
        componentVersion: "2.5.5"
      },
      "aws.iot.SiteWiseEdgeCollectorOpcua": { 
        componentVersion: "2.1.3" 
      },
      "aws.iot.SiteWiseEdgePublisher": { 
        componentVersion: "2.1.4" 
      },
      "aws.greengrass.StreamManager": { 
        componentVersion: "2.0.14" 
      }    
    })
    
        // Create sitewise gateway
    const sitewise_gateway = new sitewise.CfnGateway(
          this,
          "SitewiseGateway",
          {
              gatewayName: `${this.stackName}-Gateway`,
              gatewayPlatform: {
                  greengrassV2: {
                      coreDeviceThingName: thingName
                  }
              },
              gatewayCapabilitySummaries: [
                  {
                      capabilityNamespace: "iotsitewise:opcuacollector:2",
                      capabilityConfiguration: JSON.stringify({
                          sources: [{
                              name: "IginitionOPCUAServer",
                              endpoint: {
                                  certificateTrust: { type: "TrustAny" },
                                  endpointUri: IgnitionOpcUaEndpoint,
                                  securityPolicy: "NONE",
                                  messageSecurityMode: "NONE",
                                  identityProvider: { type: "Anonymous" },
                                  nodeFilterRules:[]
                              },
                              measurementDataStreamPrefix: ""
                          }]
                      })
                  },
                  {
                      capabilityNamespace: "iotsitewise:publisher:2",
                      capabilityConfiguration: JSON.stringify({
                          SiteWisePublisherConfiguration: {
                              publishingOrder: "TIME_ORDER"
                          }
                      })
                  },
              ]
          }
    )
    sitewise_gateway.node.addDependency(greengrassDeployment); 

    // Set stack outputs to be consumed by local processes
    new cdk.CfnOutput(this, "RequestTopic", {
      value: `${thingName}/sec_ws/request`
    })
    new cdk.CfnOutput(this, "ResponseTopic", {
      value: `${thingName}/sec_ws/response`
    })
    
    // ************ End of CDK Constructs / stack - Supporting functions below ************
    function makeid(length: number, seed: string) {
      // Generate a n-length random value for each resource
      var result = ""
      var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      var charactersLength = characters.length
      seedrandom(seed, { global: true })
      for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
      }
      return result
    }

    interface ResourceName {
      stackName: string
      baseName: string
      suffix: string
      resourceRegex: string
      maxLength: number
    }

    function fullResourceName({ stackName, baseName, suffix, resourceRegex, maxLength }: ResourceName) {
      let re = new RegExp(`[^\\[${resourceRegex}]`, "g")
      let resourceName = `${stackName}-${baseName}`.replace(re, "")
      resourceName = resourceName.substring(0, maxLength - suffix.length - 1)
      resourceName = `${resourceName}-${suffix}`
      return resourceName
    }
  }
}

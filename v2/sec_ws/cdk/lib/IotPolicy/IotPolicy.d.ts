import { Construct } from 'constructs';
import * as cr from "aws-cdk-lib/custom-resources";
export interface Mapping {
    [keys: string]: string;
}
/**
 * @summary The properties for the IotPolicyProps class.
 */
export interface IotPolicyProps {
    /**
     * Name of the AWS IoT Core policy to create.
     *
     * @default - None
     */
    iotPolicyName: string;
    /**
     * The AWS IoT policy to be created and attached to the certificate.
     * JSON string converted to IoT policy, lodash format for replacement.
     *
     * @default - None
     */
    iotPolicy: string;
    /**
     * An object of parameters and values to be replaced if a Jinja template is
     * provided. For each matching parameter in the policy template, the value
     * will be used.
     *
     * @default - None
     */
    policyParameterMapping?: object;
    /**
     * Certificate Arn to which to attach the policy
     *
     * @default - None
     */
    certificateArn?: string;
}
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
export declare class IotPolicy extends Construct {
    readonly thingArn: string;
    readonly iotPolicyArn: string;
    readonly certificateArn: string;
    readonly certificatePemParameter: string;
    readonly privateKeySecretParameter: string;
    readonly dataAtsEndpointAddress: string;
    readonly credentialProviderEndpointAddress: string;
    private customResourceName;
    /**
     * @summary Constructs a new instance of the IotPolicy class.
     * @param {cdp.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a scope-unique id.
     * @param {IotPolicyProps} props - user provided props for the construct.
     * @since 1.116.0
     */
    constructor(scope: Construct, id: string, props: IotPolicyProps);
    static getOrCreateProvider: (scope: Construct, resourceName: string) => cr.Provider;
}

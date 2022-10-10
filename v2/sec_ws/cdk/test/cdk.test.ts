import { expect as expectCDK, matchTemplate, MatchStyle, SynthUtils } from "@aws-cdk/assert"
import * as cdk from "aws-cdk-lib"
import { SecWsStack } from "../lib/SecWsStack"

const scope = new cdk.Stack()
const _stack = new SecWsStack(scope, "mystack", {})
const stack = SynthUtils.toCloudFormation(scope)

test("create the stack", () => {
  expect(_stack).not.toBeNull()
  expect(stack).not.toBeNull()
})

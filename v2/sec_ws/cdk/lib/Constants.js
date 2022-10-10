"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
Object.defineProperty(exports, "__esModule", { value: true });
exports.secWsIoTPolicy = void 0;
// IoT policy for source event interaction
// NOTE - minimal policy from base accelerator provides Connect access
exports.secWsIoTPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:Receive", "iot:Publish"],
      "Resource": [
        "arn:aws:iot:<%= region %>:<%= account %>:topic/<%= thingname %>/sec_ws/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Subscribe"],
      "Resource": [
        "arn:aws:iot:<%= region %>:<%= account %>:topicfilter/<%= thingname %>/sec_ws/*"
      ]
    }
  ]
}`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBcUU7QUFDckUsaUNBQWlDOzs7QUFFakMsMENBQTBDO0FBQzFDLHNFQUFzRTtBQUN6RCxRQUFBLGNBQWMsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBa0I1QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogTUlULTBcblxuLy8gSW9UIHBvbGljeSBmb3Igc291cmNlIGV2ZW50IGludGVyYWN0aW9uXG4vLyBOT1RFIC0gbWluaW1hbCBwb2xpY3kgZnJvbSBiYXNlIGFjY2VsZXJhdG9yIHByb3ZpZGVzIENvbm5lY3QgYWNjZXNzXG5leHBvcnQgY29uc3Qgc2VjV3NJb1RQb2xpY3kgPSBge1xuICBcIlZlcnNpb25cIjogXCIyMDEyLTEwLTE3XCIsXG4gIFwiU3RhdGVtZW50XCI6IFtcbiAgICB7XG4gICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICBcIkFjdGlvblwiOiBbXCJpb3Q6UmVjZWl2ZVwiLCBcImlvdDpQdWJsaXNoXCJdLFxuICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgIFwiYXJuOmF3czppb3Q6PCU9IHJlZ2lvbiAlPjo8JT0gYWNjb3VudCAlPjp0b3BpYy88JT0gdGhpbmduYW1lICU+L3NlY193cy8qXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgIFwiQWN0aW9uXCI6IFtcImlvdDpTdWJzY3JpYmVcIl0sXG4gICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgXCJhcm46YXdzOmlvdDo8JT0gcmVnaW9uICU+OjwlPSBhY2NvdW50ICU+OnRvcGljZmlsdGVyLzwlPSB0aGluZ25hbWUgJT4vc2VjX3dzLypcIlxuICAgICAgXVxuICAgIH1cbiAgXVxufWBcbiJdfQ==
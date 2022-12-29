/*
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package api

import (
	"fmt"
	"time"

	"github.com/apache/incubator-devlake/errors"
	"github.com/apache/incubator-devlake/models/domainlayer"
	"github.com/apache/incubator-devlake/models/domainlayer/devops"
	"github.com/apache/incubator-devlake/models/domainlayer/didgen"
	"github.com/apache/incubator-devlake/plugins/core"
	"github.com/apache/incubator-devlake/plugins/core/dal"
	"github.com/apache/incubator-devlake/plugins/helper"
	"github.com/apache/incubator-devlake/plugins/jenkins/models"
	"github.com/apache/incubator-devlake/utils"
)

func MakeDataSourcePipelinePlanV200(subtaskMetas []core.SubTaskMeta, connectionId uint64, bpScopes []*core.BlueprintScopeV200, syncPolicy *core.BlueprintSyncPolicy) (core.PipelinePlan, []core.Scope, errors.Error) {
	plan := make(core.PipelinePlan, len(bpScopes))
	plan, err := makeDataSourcePipelinePlanV200(subtaskMetas, plan, bpScopes, connectionId, syncPolicy)
	if err != nil {
		return nil, nil, err
	}
	scopes, err := makeScopesV200(bpScopes, connectionId)
	if err != nil {
		return nil, nil, err
	}

	return plan, scopes, nil
}

func makeDataSourcePipelinePlanV200(
	subtaskMetas []core.SubTaskMeta,
	plan core.PipelinePlan,
	bpScopes []*core.BlueprintScopeV200,
	connectionId uint64,
	syncPolicy *core.BlueprintSyncPolicy,
) (core.PipelinePlan, errors.Error) {
	for i, bpScope := range bpScopes {
		stage := plan[i]
		if stage == nil {
			stage = core.PipelineStage{}
		}

		// construct task options for Jenkins
		options := make(map[string]interface{})
		options["scopeId"] = bpScope.Id
		options["connectionId"] = connectionId

		if syncPolicy.CreatedDateAfter != nil {
			options["createdDateAfter"] = syncPolicy.CreatedDateAfter.Format(time.RFC3339)
		}
		subtasks, err := helper.MakePipelinePlanSubtasks(subtaskMetas, bpScope.Entities)
		if err != nil {
			return nil, err
		}
		stage = append(stage, &core.PipelineTask{
			Plugin:   "jenkins",
			Subtasks: subtasks,
			Options:  options,
		})
		plan[i] = stage
	}

	return plan, nil
}

func makeScopesV200(bpScopes []*core.BlueprintScopeV200, connectionId uint64) ([]core.Scope, errors.Error) {
	scopes := make([]core.Scope, 0)
	for _, bpScope := range bpScopes {
		jenkinsJob := &models.JenkinsJob{}
		// get repo from db
		err := basicRes.GetDal().First(jenkinsJob,
			dal.Where(`connection_id = ? and full_name = ?`,
				connectionId, bpScope.Id))
		if err != nil {
			return nil, errors.Default.Wrap(err, fmt.Sprintf("fail to find jenkinsJob%s", bpScope.Id))
		}

		// add cicd_scope to scopes
		if utils.StringsContains(bpScope.Entities, core.DOMAIN_TYPE_CICD) {
			scopeCICD := &devops.CicdScope{
				DomainEntity: domainlayer.DomainEntity{
					Id: didgen.NewDomainIdGenerator(&models.JenkinsJob{}).Generate(connectionId, jenkinsJob.FullName),
				},
				Name: jenkinsJob.FullName,
			}
			scopes = append(scopes, scopeCICD)
		}
	}
	return scopes, nil
}

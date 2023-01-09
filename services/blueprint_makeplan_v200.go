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

package services

import (
	"encoding/json"
	"fmt"

	"github.com/apache/incubator-devlake/errors"
	"github.com/apache/incubator-devlake/models"
	"github.com/apache/incubator-devlake/models/domainlayer/crossdomain"
	"github.com/apache/incubator-devlake/plugins/core"
	"github.com/apache/incubator-devlake/plugins/core/dal"
)

// GeneratePlanJsonV200 generates pipeline plan according v2.0.0 definition
func GeneratePlanJsonV200(
	projectName string,
	syncPolicy core.BlueprintSyncPolicy,
	sources *models.BlueprintSettings,
	metrics map[string]json.RawMessage,
) (core.PipelinePlan, errors.Error) {
	// generate plan and collect scopes
	plan, scopes, err := genPlanJsonV200(projectName, syncPolicy, sources, metrics)
	if err != nil {
		return nil, err
	}
	// save scopes to database
	if len(scopes) > 0 {
		for _, scope := range scopes {
			err = db.CreateOrUpdate(scope)
			if err != nil {
				scopeInfo := fmt.Sprintf("[Id:%s][Name:%s][TableName:%s]", scope.ScopeId(), scope.ScopeName(), scope.TableName())
				return nil, errors.Default.Wrap(err, fmt.Sprintf("failed to create scopes:[%s]", scopeInfo))
			}
		}
	}
	// refresh project_mapping table to reflect project/scopes relationship
	if len(projectName) != 0 {
		err = db.Delete(&crossdomain.ProjectMapping{}, dal.Where("project_name = ?", projectName))
		if err != nil {
			return nil, err
		}
		for _, scope := range scopes {
			projectMapping := &crossdomain.ProjectMapping{
				ProjectName: projectName,
				Table:       scope.TableName(),
				RowId:       scope.ScopeId(),
			}
			err = db.Create(projectMapping)
			if err != nil {
				return nil, err
			}
		}
	}
	return plan, err
}

func genPlanJsonV200(
	projectName string,
	syncPolicy core.BlueprintSyncPolicy,
	sources *models.BlueprintSettings,
	metrics map[string]json.RawMessage,
) (core.PipelinePlan, []core.Scope, errors.Error) {
	connections := make([]*core.BlueprintConnectionV200, 0)
	err := errors.Convert(json.Unmarshal(sources.Connections, &connections))
	if err != nil {
		return nil, nil, err
	}

	// make plan for data-source plugins fist. generate plan for each
	// connections, then merge them into one legitimate plan and collect the
	// scopes produced by the data-source plugins
	sourcePlans := make([]core.PipelinePlan, len(connections))
	scopes := make([]core.Scope, 0, len(connections))
	for i, connection := range connections {
		if len(connection.Scopes) == 0 && connection.Plugin != `webhook` && connection.Plugin != `jenkins` {
			// webhook needn't scopes
			// jenkins may upgrade from v100 and its' scope is empty
			return nil, nil, errors.Default.New(fmt.Sprintf("connections[%d].scopes is empty", i))
		}
		plugin, err := core.GetPlugin(connection.Plugin)
		if err != nil {
			return nil, nil, err
		}
		if pluginBp, ok := plugin.(core.DataSourcePluginBlueprintV200); ok {
			var pluginScopes []core.Scope
			sourcePlans[i], pluginScopes, err = pluginBp.MakeDataSourcePipelinePlanV200(
				connection.ConnectionId,
				connection.Scopes,
				syncPolicy,
			)
			if err != nil {
				return nil, nil, err
			}
			// collect scopes for the project. a github repository may produce
			// 2 scopes, 1 repo and 1 board
			scopes = append(scopes, pluginScopes...)
		} else {
			return nil, nil, errors.Default.New(
				fmt.Sprintf("plugin %s does not support DataSourcePluginBlueprintV200", connection.Plugin),
			)
		}
	}
	// make plans for metric plugins
	metricPlans := make([]core.PipelinePlan, len(metrics))
	i := 0
	for metricPluginName, metricPluginOptJson := range metrics {
		plugin, err := core.GetPlugin(metricPluginName)
		if err != nil {
			return nil, nil, err
		}
		if pluginBp, ok := plugin.(core.MetricPluginBlueprintV200); ok {
			// If we enable one metric plugin, even if it has nil option, we still process it
			if len(metricPluginOptJson) == 0 {
				metricPluginOptJson = json.RawMessage("{}")
			}
			metricPlans[i], err = pluginBp.MakeMetricPluginPipelinePlanV200(projectName, metricPluginOptJson)
			if err != nil {
				return nil, nil, err
			}
			i += 1
		} else {
			return nil, nil, errors.Default.New(
				fmt.Sprintf("plugin %s does not support MetricPluginBlueprintV200", metricPluginName),
			)
		}
	}
	plan := SequencializePipelinePlans(
		ParallelizePipelinePlans(sourcePlans...),
		ParallelizePipelinePlans(metricPlans...),
	)
	return plan, scopes, err
}

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

package tasks

import (
	"encoding/json"
	"fmt"
	"github.com/apache/incubator-devlake/core/errors"
	"github.com/apache/incubator-devlake/core/plugin"
	"github.com/apache/incubator-devlake/helpers/pluginhelper/api"
	"net/http"
	"net/url"
)

const RAW_PROJECT_TABLE = "zentao_api_projects"

var _ plugin.SubTaskEntryPoint = CollectProject

func CollectProject(taskCtx plugin.SubTaskContext) errors.Error {
	data := taskCtx.GetData().(*ZentaoTaskData)
	collector, err := api.NewApiCollector(api.ApiCollectorArgs{
		RawDataSubTaskArgs: api.RawDataSubTaskArgs{
			Ctx: taskCtx,
			Params: ZentaoApiParams{
				ConnectionId: data.Options.ConnectionId,
				ExecutionId:  data.Options.ExecutionId,
				ProductId:    data.Options.ProductId,
				ProjectId:    data.Options.ProjectId,
			},
			Table: RAW_PROJECT_TABLE,
		},
		ApiClient: data.ApiClient,
		// TODO write which api would you want request
		UrlTemplate: "projects",
		Query: func(reqData *api.RequestData) (url.Values, errors.Error) {
			query := url.Values{}
			query.Set("page", fmt.Sprintf("%v", reqData.Pager.Page))
			query.Set("limit", fmt.Sprintf("%v", reqData.Pager.Size))
			return query, nil
		},
		ResponseParser: func(res *http.Response) ([]json.RawMessage, errors.Error) {
			var data struct {
				Projects []json.RawMessage `json:"projects"`
			}
			err := api.UnmarshalResponse(res, &data)
			return data.Projects, err
		},
	})
	if err != nil {
		return err
	}

	return collector.Execute()
}

var CollectProjectMeta = plugin.SubTaskMeta{
	Name:             "CollectProject",
	EntryPoint:       CollectProject,
	EnabledByDefault: true,
	Description:      "Collect Project data from Zentao api",
}

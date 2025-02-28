/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React, { useState, useMemo } from 'react';
import type { TabId } from '@blueprintjs/core';
import { Tabs, Tab } from '@blueprintjs/core';

import { PageLoading } from '@/components';
import { Plugins } from '@/plugins';

import type { UseDetailProps } from './use-detail';
import { useDetail } from './use-detail';
import { Configuration } from './panel/configuration';
import { Status } from './panel/status';
import * as S from './styled';

interface Props extends UseDetailProps {}

export const BlueprintDetail = ({ id }: Props) => {
  const [activeTab, setActiveTab] = useState<TabId>('status');

  const { loading, blueprint, pipelineId, operating, onRun, onUpdate, onRefresh } = useDetail({
    id,
  });

  const showJenkinsTips = useMemo(() => {
    const jenkins = blueprint && blueprint.settings?.connections.find((cs) => cs.plugin === Plugins.Jenkins);
    return jenkins && !jenkins.scopes.length;
  }, [blueprint]);

  if (loading || !blueprint) {
    return <PageLoading />;
  }

  return (
    <S.Wrapper>
      <Tabs selectedTabId={activeTab} onChange={(at) => setActiveTab(at)}>
        <Tab
          id="status"
          title="Status"
          panel={<Status blueprint={blueprint} pipelineId={pipelineId} operating={operating} onRun={onRun} />}
        />
        <Tab
          id="configuration"
          title="Configuration"
          panel={
            <Configuration blueprint={blueprint} operating={operating} onUpdate={onUpdate} onRefresh={onRefresh} />
          }
        />
      </Tabs>
      {showJenkinsTips && (
        <S.JenkinsTips>
          <p>Please add the "Jenkins jobs" to collect before this Blueprint can run again.</p>
        </S.JenkinsTips>
      )}
    </S.Wrapper>
  );
};

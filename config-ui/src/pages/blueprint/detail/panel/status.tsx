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

import React, { useMemo } from 'react';
import { Button, Intent } from '@blueprintjs/core';

import { getCron } from '@/config';
import { PipelineInfo, PipelineHistorical } from '@/pages';
import { formatTime } from '@/utils';

import type { BlueprintType } from '../../types';

import * as S from '../styled';

interface Props {
  blueprint: BlueprintType;
  pipelineId?: ID;
  operating: boolean;
  onRun: () => void;
}

export const Status = ({ blueprint, pipelineId, operating, onRun }: Props) => {
  const cron = useMemo(() => getCron(blueprint.isManual, blueprint.cronConfig), [blueprint]);

  const handleRunNow = () => onRun();

  return (
    <S.StatusPanel>
      <div className="info">
        <span>{cron.value === 'manual' ? 'Manual' : `Next Run: ${formatTime(cron.nextTime, 'YYYY-MM-DD HH:mm')}`}</span>
        <span>
          <Button
            disabled={!blueprint.enable}
            loading={operating}
            small
            intent={Intent.PRIMARY}
            text="Run Now"
            onClick={handleRunNow}
          />
        </span>
      </div>
      <div className="block">
        <h3>Current Pipeline</h3>
        <PipelineInfo id={pipelineId} />
      </div>
      <div className="block">
        <h3>Historical Pipelines</h3>
        <PipelineHistorical blueprintId={blueprint.id} />
      </div>
    </S.StatusPanel>
  );
};

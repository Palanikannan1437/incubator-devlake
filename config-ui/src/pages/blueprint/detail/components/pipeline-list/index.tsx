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

import React, { useMemo } from 'react'
import {
  ButtonGroup,
  Button,
  Icon,
  Intent,
  Colors,
  IconName
} from '@blueprintjs/core'
import { saveAs } from 'file-saver'
import styled from 'styled-components'

import { DEVLAKE_ENDPOINT } from '@/config'
import { Card, Table, ColumnType, Loading } from '@/components'
import {
  PipelineType,
  StatusEnum,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_CLS
} from '@/pages'
import { formatTime, duration } from '@/utils'

import * as API from './api'

const StatusColumn = styled.div`
  display: flex;
  align-items: center;

  .bp4-icon {
    margin-right: 4px;
  }

  &.ready,
  &.cancel {
    color: #94959f;
  }

  &.loading {
    color: #7497f7;
  }

  &.success {
    color: ${Colors.GREEN3};
  }

  &.error {
    color: ${Colors.RED3};
  }
`

interface Props {
  pipelines: PipelineType[]
}

export const PipelineList = ({ pipelines }: Props) => {
  const handleDownloadLog = async (id: ID) => {
    const res = await API.getPipelineLog(id)
    if (res) {
      saveAs(
        `${DEVLAKE_ENDPOINT}/pipelines/${id}/logging.tar.gz`,
        'logging.tar.gz'
      )
    }
  }

  const columns = useMemo(
    () =>
      [
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (val: StatusEnum) => (
            <StatusColumn className={STATUS_CLS(val)}>
              {STATUS_ICON[val] === 'loading' ? (
                <Loading style={{ marginRight: 4 }} size={14} />
              ) : (
                <Icon
                  style={{ marginRight: 4 }}
                  icon={STATUS_ICON[val] as IconName}
                />
              )}
              <span>{STATUS_LABEL[val]}</span>
            </StatusColumn>
          )
        },
        {
          title: 'Started at',
          dataIndex: 'beganAt',
          key: 'beganAt',
          render: (val: string) => (val ? formatTime(val) : '-')
        },
        {
          title: 'Completed at',
          dataIndex: 'finishedAt',
          key: 'finishedAt',
          render: (val: string) => (val ? formatTime(val) : '-')
        },
        {
          title: 'Duration',
          dataIndex: ['beganAt', 'finishedAt'],
          key: 'duration',
          render: ({ beganAt, finishedAt }) => (
            <span>{duration(beganAt, finishedAt)}</span>
          )
        },
        {
          title: '',
          dataIndex: 'id',
          key: 'action',
          render: (id: ID) => (
            <ButtonGroup>
              {/* <Button minimal intent={Intent.PRIMARY} icon='code' /> */}
              <Button
                minimal
                intent={Intent.PRIMARY}
                icon='document'
                onClick={() => handleDownloadLog(id)}
              />
              {/* <Button minimal intent={Intent.PRIMARY} icon='chevron-right' /> */}
            </ButtonGroup>
          )
        }
      ] as ColumnType<PipelineType>,
    []
  )

  return !pipelines.length ? (
    <Card>There are no historical runs associated with this blueprint.</Card>
  ) : (
    <Table columns={columns} dataSource={pipelines} />
  )
}

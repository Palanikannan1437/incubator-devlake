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

import React, { useState, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Icon, Button, Switch, Colors, Intent } from '@blueprintjs/core';
import dayjs from 'dayjs';

import { Table, ColumnType } from '@/components';
import { getCron, transformEntities } from '@/config';
import { PluginConfig, DataScopeList, Plugins } from '@/plugins';

import type { BlueprintType } from '../../types';
import { ModeEnum } from '../../types';
import { validRawPlan } from '../../utils';
import { AdvancedEditor } from '../../components';

import type { ConfigConnectionItemType } from '../types';
import { UpdateNameDialog, UpdatePolicyDialog, AddScopeDialog, UpdateTransformationDialog } from '../components';
import * as S from '../styled';

type Type = 'name' | 'frequency' | 'scope' | 'transformation';

interface Props {
  blueprint: BlueprintType;
  operating: boolean;
  onUpdate: (bp: any) => void;
  onRefresh: () => void;
}

export const Configuration = ({ blueprint, operating, onUpdate, onRefresh }: Props) => {
  const [type, setType] = useState<Type>();
  const [curConnection, setCurConnection] = useState<ConfigConnectionItemType>();
  const [rawPlan, setRawPlan] = useState('');

  const history = useHistory();

  useEffect(() => {
    setRawPlan(JSON.stringify(blueprint.plan, null, '  '));
  }, [blueprint]);

  const cron = useMemo(() => getCron(blueprint.isManual, blueprint.cronConfig), [blueprint]);

  const connections = useMemo(
    () =>
      blueprint.settings?.connections
        .filter((cs) => cs.plugin !== Plugins.Webhook)
        .map((cs: any) => {
          const plugin = PluginConfig.find((p) => p.plugin === cs.plugin) as any;
          return {
            icon: plugin.icon,
            name: plugin.name,
            connectionId: cs.connectionId,
            entities: plugin.entities,
            selectedEntites: cs.scopes?.[0]?.entities ?? [],
            plugin: cs.plugin,
            scope: cs.scopes,
            scopeIds: cs.scopes.map((sc: any) => sc.id),
          };
        })
        .filter(Boolean),
    [blueprint],
  );

  const handleCancel = () => {
    setType(undefined);
  };

  const handleUpdateName = async (name: string) => {
    await onUpdate({ name });
    handleCancel();
  };

  const handleUpdatePolicy = async (policy: any) => {
    await onUpdate(policy);
    handleCancel();
  };

  const handleToggleEnabled = (checked: boolean) => onUpdate({ enable: checked });

  const handleUpdateConnection = (updated: any) =>
    onUpdate({
      settings: {
        version: '2.0.0',
        connections: blueprint.settings.connections.map((cs) =>
          cs.plugin === updated.plugin && cs.connectionId === updated.connectionId ? updated : cs,
        ),
      },
    });

  const handleUpdatePlan = () =>
    onUpdate({
      plan: !validRawPlan(rawPlan) ? JSON.parse(rawPlan) : JSON.stringify([[]], null, '  '),
    });

  const columns = useMemo(
    () =>
      [
        {
          title: 'Data Connections',
          dataIndex: ['icon', 'name'],
          key: 'connection',
          render: ({ icon, name }: Pick<ConfigConnectionItemType, 'icon' | 'name'>) => (
            <S.ConnectionColumn>
              <img src={icon} alt="" />
              <span>{name}</span>
            </S.ConnectionColumn>
          ),
        },
        {
          title: 'Data Entities',
          dataIndex: 'selectedEntites',
          key: 'selectedEntites',
          render: (val: string[]) => (
            <>
              {transformEntities(val).map(({ label, value }) => (
                <div key={value}>{label}</div>
              ))}
            </>
          ),
        },
        {
          title: 'Data Scope and Transformation',
          dataIndex: ['plugin', 'connectionId', 'scopeIds', 'scope'],
          key: 'sopce',
          render: ({
            plugin,
            connectionId,
            scopeIds,
            scope,
          }: Pick<ConfigConnectionItemType, 'plugin' | 'connectionId' | 'scopeIds' | 'scope'>) => (
            <DataScopeList
              groupByTs
              plugin={plugin}
              connectionId={connectionId}
              scopeIds={scopeIds}
              onDelete={(plugin: Plugins, connectionId: ID, scopeId: ID) =>
                handleUpdateConnection({
                  plugin,
                  connectionId,
                  scopes: scope.filter((sc) => sc.id !== scopeId),
                })
              }
            />
          ),
        },
        {
          title: '',
          key: 'action',
          align: 'center',
          render: (_, row: ConfigConnectionItemType) => (
            <S.ActionColumn>
              <div
                className="item"
                onClick={() => {
                  setType('scope');
                  setCurConnection(row);
                }}
              >
                <Icon icon="add" color={Colors.BLUE2} />
                <span>Add Data Scope</span>
              </div>
              <div
                className="item"
                onClick={() => {
                  setType('transformation');
                  setCurConnection(row);
                }}
              >
                <Icon icon="annotation" color={Colors.BLUE2} />
                <span>Re-apply Transformation</span>
              </div>
              <div className="item" onClick={() => history.push('/transformations')}>
                <Icon icon="cog" color={Colors.BLUE2} />
                <span>Manage Transformations</span>
              </div>
            </S.ActionColumn>
          ),
        },
      ] as ColumnType<ConfigConnectionItemType>,
    [],
  );

  return (
    <S.ConfigurationPanel>
      <div className="top">
        <div className="block">
          <h3>Name</h3>
          <div className="detail">
            <span>{blueprint.name}</span>
            <Icon icon="annotation" color={Colors.BLUE2} onClick={() => setType('name')} />
          </div>
        </div>
        <div className="block">
          <h3>Sync Policy</h3>
          <div className="detail">
            <span>
              {cron.label} {cron.value !== 'manual' ? dayjs(cron.nextTime).format('HH:mm A') : null}
            </span>
            <Icon icon="annotation" color={Colors.BLUE2} onClick={() => setType('frequency')} />
          </div>
        </div>
        <div className="block">
          <h3>Enabled</h3>
          <div className="detail">
            <Switch
              checked={blueprint.enable}
              onChange={(e) => handleToggleEnabled((e.target as HTMLInputElement).checked)}
            />
          </div>
        </div>
      </div>
      {blueprint.mode === ModeEnum.normal && (
        <div className="bottom">
          <h3>Data Scope and Transformation</h3>
          <Table columns={columns} dataSource={connections} />
        </div>
      )}
      {blueprint.mode === ModeEnum.advanced && (
        <div className="bottom">
          <h3>JSON Configuration</h3>
          <AdvancedEditor value={rawPlan} onChange={setRawPlan} />
          <div className="btns">
            <Button intent={Intent.PRIMARY} text="Save" onClick={handleUpdatePlan} />
          </div>
        </div>
      )}
      {type === 'name' && (
        <UpdateNameDialog
          name={blueprint.name}
          operating={operating}
          onCancel={handleCancel}
          onSubmit={handleUpdateName}
        />
      )}
      {type === 'frequency' && (
        <UpdatePolicyDialog
          blueprint={blueprint}
          isManual={blueprint.isManual}
          cronConfig={blueprint.cronConfig}
          skipOnFail={blueprint.skipOnFail}
          createdDateAfter={blueprint.settings?.createdDateAfter}
          operating={operating}
          onCancel={handleCancel}
          onSubmit={handleUpdatePolicy}
        />
      )}
      {type === 'scope' && (
        <AddScopeDialog connection={curConnection} onCancel={handleCancel} onSubmit={handleUpdateConnection} />
      )}
      {type === 'transformation' && (
        <UpdateTransformationDialog connection={curConnection} onCancel={handleCancel} onRefresh={onRefresh} />
      )}
    </S.ConfigurationPanel>
  );
};

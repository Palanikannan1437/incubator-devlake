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

import React from 'react';

import { Dialog } from '@/components';
import { Transformation } from '@/plugins';

import type { ConfigConnectionItemType } from '../../types';

interface Props {
  connection?: ConfigConnectionItemType;
  onCancel: () => void;
  onRefresh: () => void;
}

export const UpdateTransformationDialog = ({ connection, onCancel, onRefresh }: Props) => {
  if (!connection) return null;

  const { plugin, connectionId, scope } = connection;

  const handleSaveAfter = () => {
    onRefresh();
    onCancel();
  };

  return (
    <Dialog
      isOpen
      title="Assign a different transformation by"
      footer={null}
      style={{ width: 900 }}
      onCancel={onCancel}
    >
      <Transformation
        from="update"
        plugin={plugin}
        connectionId={connectionId}
        scopeIds={scope.map((sc) => sc.id)}
        onCancel={onCancel}
        onSave={handleSaveAfter}
      />
    </Dialog>
  );
};

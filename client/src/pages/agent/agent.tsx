import React, { useEffect, useState } from 'react';
import agentLogo from '../../assets/images/agent-logo1.png';
import '../../styles/agent.scss';
import loadable from '@loadable/component';
import { createQaiConverse, getAllQaiConverse } from '../../utils/api-qai-converse';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';
import { ConversationType } from '../../models/agent';

const PlusIcon = loadable(() => import('../../icons/PlusIcon'));
const AgentChat = loadable(() => import('./agentChat'));

const AgentBot: React.FC = () => {
  const [queryList, setQueryList] = useState<ConversationType[]>([]);
  const [activeQuery, setActiveQuery] = useState('');
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await getAllQaiConverse(accountId);
    if (res?.conversations) {
      setQueryList(res.conversations);
      if (!activeQuery) {
        setActiveQuery(res.conversations?.[0]?._id);
      }
    }
  };

  const onAddQuery = async () => {
    const res = await createQaiConverse(accountId);
    if (res?.conversation_id) {
      const newQuery = [...queryList, res?.conversation_id];
      setQueryList(newQuery);
      setActiveQuery(res?.conversation_id?._id);
    }
  };

  return (
    <div className="agentbots">
      <h2>
        <span className="agent-icon">
          <img src={agentLogo} alt="agnet_logo" />
        </span>
        Qai
      </h2>

      <div className="agent-container">
        <div className="agent-sidebar no-scrollbar">
          <div className="agent-sidebar-header">
            <p className="agent-sidebar-title">Query History</p>
            <div className="query-add" onClick={onAddQuery}>
              <PlusIcon />
            </div>
          </div>
          <div className="agent-query-list">
            {queryList?.length > 0 ? (
              queryList.map((query, index) => (
                <div
                  key={index}
                  className="agent-query-item"
                  onClick={() => setActiveQuery(query._id)}
                >
                  <p className={activeQuery === query._id ? '' : 'query-disabled'}>{query.title}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center">
                There is no conversation history. please create by clicking the + button
              </div>
            )}
          </div>
        </div>
        <div className="agent-content">
          {activeQuery ? (
            <AgentChat conversationId={activeQuery} fetchConversations={fetchConversations} />
          ) : (
            <div className="text-sm text-gray-500 mt-10 text-center">
              There is no conversation history. please create by clicking the + button
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentBot;

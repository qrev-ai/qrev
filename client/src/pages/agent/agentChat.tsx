import React, { useState, useEffect, KeyboardEvent, useRef, useMemo } from 'react';
import loadable from '@loadable/component';
import agentLogo from '../../assets/images/agent-logo2.png';
import { getSplitArray } from '../../utils/helper';
import MsgEditIcon from '../../icons/MsgEditIcon';
import MsgRefreshIcon from '../../icons/MsgRefreshIcon';
import MsgCopyIcon from '../../icons/MsgCopyIcon';
import MsgSendIcon from '../../icons/MsgSendIcon';
import copy from 'copy-to-clipboard';
import { onSendMail } from '../../utils/api-sendEmail';

import CSVReader from 'react-csv-reader';
import { ColDef, ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { RxPlus } from 'react-icons/rx';
import { AgGridReact } from '@ag-grid-community/react';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import { BsFiletypeCsv } from 'react-icons/bs';
import { IoCloseOutline } from 'react-icons/io5';
import { getQaiConverseById, qaiConverse, sendCampaign } from '../../utils/api-qai-converse';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const SendIcon = loadable(() => import('../../icons/SendIcon'));
const ChatPeopleIcon = loadable(() => import('../../icons/ChatPeopleIcon'));
const ChatLoader = loadable(() => import('../../components/ChatLoader'));

const CsvTable = ({ rowData, columnDefs }: any) => {
  const gridRef = useRef<AgGridReact>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const defaultColDef = useMemo<ColDef>(() => {
    return {
      editable: true,
      cellDataType: false,
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  return (
    <div className="flex flex-col w-[70vw] h-[50vh] bg-white pt-4 pr-0">
      <div style={gridStyle} className={'ag-theme-alpine'}>
        <AgGridReact
          ref={gridRef}
          animateRows
          deltaSort
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          editType={'fullRow'}
        />
      </div>
    </div>
  );
};

const AgentChat = ({
  conversationId,
  fetchConversations,
}: {
  conversationId: string;
  fetchConversations: () => void;
}): React.ReactElement => {
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState('');
  const [uploadedData, setUploaded] = useState<any>();
  const [fileInfo, setFileInfo] = useState<any>();
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const [conversation, setConversation] = useState<any>(null);
  const [emailEditable, setEditable] = useState<boolean>(false);
  const [messageTemplate, setTemplate] = useState<any>({
    subject: 'Exclusive Christmas Offer: 15% Off until Jan 2, 2024!',
    body: 'Dear [Senior Designation],\nCelebrate this season with our exclusive Christmas offer! Get ahead in 2024 by enjoying a 15% discount on [Your Product/Service]. Embrace the festive spirit and make the most of this limited-time offer. Act before Jan 2, 2024, to avail yourself of this special discount.\n\nWarm regards,\n[Your Name]\n[Your Position]\n[Your Contact Information]',
  });

  const chatsScrollRef = useRef(null);
  const csvRef = useRef<any>(null);

  useEffect(() => {
    scrollToBottom();
  });

  useEffect(() => {
    fetchConversation();
  }, [conversationId]);

  const fetchConversation = async () => {
    const res = await getQaiConverseById(accountId, conversationId);
    setConversation(res?.conversation);
  };

  const onSubmit = async () => {
    if (chatLoading) return;
    setChatLoading(true);
    const request: {
      query: string;
      conversation_id: string;
      uploaded_data?: {
        file_name: string;
        values: any;
      };
    } = { query: chatText, conversation_id: conversationId };

    if (uploadedData) {
      request.uploaded_data = {
        file_name: fileInfo.name,
        values: uploadedData,
      };
    }

    const res = await qaiConverse(accountId, request);
    if (res) {
      const campaign = res?.result?.actions?.find((item: any) => item.type === 'list');
      if (campaign) {
        await localStorage.setItem('qrev-campaign', JSON.stringify(campaign));
      }
    }
    setChatLoading(false);
    setChatText('');
    scrollToBottom();
    resetFile();
    fetchConversation();
    fetchConversations();
  };

  const onKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && chatText) {
      e.preventDefault();
      await onSubmit();
    }
  };

  const sendEmail = async (id: string) => {
    await sendCampaign(accountId, {
      sequence_id: id,
    });

    const toEmails = ['jeff@qrev.ai', 'sharp.blader2050@gmail.com'];
    onSendMail({
      recipients: toEmails,
      subject: messageTemplate?.subject,
      body: messageTemplate?.body,
    })
      .then((res) => {
        console.log('res', res);
      })
      .catch((err) => {
        console.log('err', err);
      });
  };

  const scrollToBottom = () => {
    const chatScrollRefCurrent = chatsScrollRef.current as any;
    if (chatScrollRefCurrent) {
      const scrollTimer = setTimeout(() => {
        chatScrollRefCurrent.scrollTop =
          chatScrollRefCurrent.scrollHeight - chatScrollRefCurrent.clientHeight;
        clearTimeout(scrollTimer);
      }, 10);
    }
  };

  const handleFileLoaded = (data: any, fileInfo: any) => {
    if (data?.length <= 1) return;
    setFileInfo(fileInfo);

    const header = data?.[0];
    data.shift();
    const rowData = data.map((item: any) =>
      item?.reduce((acc: any, element: any, index: number) => {
        const key = header?.[index]?.toLowerCase();
        acc[key] = element;
        return acc;
      }, {}),
    );
    setUploaded(rowData);
  };

  const resetFile = () => {
    setFileInfo(null);
    setUploaded(null);
    if (csvRef?.current?.value) {
      csvRef.current.value = '';
    }
  };

  if (!conversation) return <div />;

  return (
    <div className="chat-box-panel">
      <div className="chat-box-panel--body">
        <div className="chat-box-scrollable no-scrollbar" ref={chatsScrollRef}>
          <div className="chat-msgs">
            {conversation?.messages?.map((chat: any, icx: number) => (
              <div key={icx} className="chat-msg-row">
                {chat.type === 'user' ? (
                  <div className="chat-question flex flex-col items-end w-full">
                    <h3>
                      <span className="agent-chat-icon">
                        <ChatPeopleIcon />
                      </span>
                      You:
                    </h3>
                    {chat.uploaded_data?.length > 0 ? (
                      <div className="flex flex-col items-end w-full">
                        <p>{chat.value}</p>
                        <CsvTable
                          rowData={chat.uploaded_data || []}
                          columnDefs={
                            Object.keys(chat.uploaded_data?.[0])?.map((i: string) => ({
                              headerName: i,
                              field: i.toLowerCase(),
                            })) || []
                          }
                        />
                      </div>
                    ) : (
                      <p>{chat.value}</p>
                    )}
                  </div>
                ) : (
                  <div className="agent-chat-answer">
                    <h3>
                      <span className="agent-chat-icon">
                        <img src={agentLogo} alt="agent_logo" />
                      </span>
                      Qai:
                    </h3>
                    {chat?.value?.actions.map((item: any, k: number) =>
                      item.type === 'list' && item?.values?.length > 0 ? (
                        <div key={k}>
                          <p className="agent-msg-label">{item.title}</p>
                          <div className="agent-list-view">
                            <div className="list-container--header">
                              <div className="list-row-item">
                                {Object.keys(item?.values?.[0])?.map((i: string, k) => (
                                  <p key={k} className="w-[30%]">
                                    {i}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div className="list-container--body">
                              <div className="agent-list no-scrollbar">
                                {item?.values?.map((el: any, index: number) => (
                                  <div
                                    key={index}
                                    className={
                                      index % 2 ? 'list-row-item alternative-row' : 'list-row-item'
                                    }
                                  >
                                    {Object.keys(item?.values?.[0])?.map(
                                      (key: string) =>
                                        el?.[key] && <p className="w-[30%]">{el?.[key]}</p>,
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="list-container--footer"></div>
                          </div>
                        </div>
                      ) : item.type === 'email_sequence_draft' ? (
                        <div style={{ marginTop: '16px' }}>
                          <p className="agent-msg-label">{item.title}</p>
                          <div className="agent-msg-editable-body">
                            {emailEditable ? (
                              <div>
                                <div className="agent-subject-input">
                                  <label>Subject:</label>
                                  <input
                                    value={item.subject}
                                    onChange={(e) => {
                                      item.subject = e.target.value;
                                    }}
                                  />
                                </div>
                                <textarea
                                  className="agent-body-input no-scrollbar"
                                  value={item.content}
                                  onChange={(e) => {
                                    item.content = e.target.value;
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="agent-read-only">
                                <p>{`Subject : ${item.subject}`}</p>
                                <p style={{ marginBottom: 0 }}>
                                  {getSplitArray(item.content).map((v: string, ivx: number) => (
                                    <span key={`split-${ivx}`}>{v}</span>
                                  ))}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="agent-msg-actions">
                            <div
                              className="agent-msg-action-icon"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditable(true);
                              }}
                            >
                              <MsgEditIcon />
                            </div>
                            <div
                              className="agent-msg-action-icon"
                              onClick={(e) => {
                                e.preventDefault();
                                copy(item.content, {
                                  format: 'text/plain',
                                });
                              }}
                            >
                              <MsgCopyIcon width="16px" fill="#2F4858" />
                            </div>
                            <div
                              className="agent-msg-action-icon"
                              onClick={(e) => {
                                e.preventDefault();
                                setEditable(false);
                                setTemplate({
                                  subject: 'Exclusive Christmas Offer: 15% Off until Jan 2, 2024!',
                                  body: 'Dear [Senior Designation],\nCelebrate this season with our exclusive Christmas offer! Get ahead in 2024 by enjoying a 15% discount on [Your Product/Service]. Embrace the festive spirit and make the most of this limited-time offer. Act before Jan 2, 2024, to avail yourself of this special discount.\n\nWarm regards,\n[Your Name]\n[Your Position]\n[Your Contact Information]',
                                });
                              }}
                            >
                              <MsgRefreshIcon />
                            </div>
                            <div
                              className="agent-msg-action-icon"
                              style={{ marginRight: 0 }}
                              onClick={(e) => {
                                e.preventDefault();
                                sendEmail(item.sequence_id);
                              }}
                            >
                              <MsgSendIcon />
                            </div>
                          </div>
                        </div>
                      ) : item.action === 'text' ? (
                        <p>{item.response}</p>
                      ) : (
                        <div />
                      ),
                    )}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && <ChatLoader />}
          </div>
        </div>
      </div>
      <div className="w-full h-[132px] flex items-end">
        <div className="chat-box-panel--footer p-2 rounded-lg border border-gray-300 mb-4 mt-auto w-full">
          <div className="flex flex-col w-full">
            {fileInfo && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-300 w-fit mb-2 relative pr-8">
                <BsFiletypeCsv size={28} />
                <div className="flex flex-col">
                  <strong className="text-sm">{fileInfo.name}</strong>
                  <span className="text-sm text-gray-500">{fileInfo.type}</span>
                </div>
                <button
                  className="absolute right-2 top-2 flex items-center justify-center hover:text-[#3b82f680]"
                  onClick={resetFile}
                >
                  <IoCloseOutline size={20} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <div className="flex items-center justify-end mr-4">
              <CSVReader
                ref={csvRef}
                cssClass="hidden"
                onFileLoaded={(data, fileInfo) => handleFileLoaded(data, fileInfo)}
              />
              <span
                className="border border-[#C9CBCB] p-1 rounded text-sm cursor-pointer"
                onClick={() => csvRef?.current?.click()}
              >
                <RxPlus />
              </span>
            </div>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Start typing your message here..."
            />
            <div className="chatbot-over-submit flex items-center gap-4">
              <div onClick={onSubmit}>
                <SendIcon
                  fill={chatText || uploadedData?.length > 1 ? '#67A9ED' : '#F9F9F8'}
                  color={chatText || uploadedData?.length > 1 ? 'white' : '#C9CBCB'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;

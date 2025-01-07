import React, { useState, useRef, useEffect } from "react";
import { ImageIcon, Send, X, Plus, Trash2, Thermometer } from "lucide-react";

export default function ChatPage() {
  const [chats, setChats] = useState({
    chat1: { name: "New Chat", messages: [], temperature: 0.7, model: "llama3.2-vision" },
  });
  const [currentChat, setCurrentChat] = useState("chat1");
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showTempControl, setShowTempControl] = useState(false);
  const [models, setModels] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (Array.isArray(result.models)) {
          setModels(result.models); // Set the models array as the data
        } else {
          throw new Error('Invalid response format: "models" array missing');
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchModels();
  }, []);

  const createNewChat = () => {
    const newChatId = `chat${Date.now()}`;
    setChats(prev => ({
      ...prev,
      [newChatId]: { name: `New Chat`, messages: [], temperature: 0.7, model: "llama3.2-vision" }
    }));
    setCurrentChat(newChatId);
  };

  const updateTemperature = (temp) => {
    setChats(prev => ({
      ...prev,
      [currentChat]: { ...prev[currentChat], temperature: temp }
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !image) return;

    const userMessage = {
      role: "user",
      content: input,
      image: imagePreview
    };

    setChats(prev => ({
      ...prev,
      [currentChat]: {
        ...prev[currentChat],
        messages: [...prev[currentChat].messages, userMessage]
      }
    }));

    setInput(""), setImage(null), setImagePreview(null);
    
    try {
      const requestBody = {
        model: chats[currentChat].model,
        messages: [],
        stream: false,
        temperature: chats[currentChat].temperature
      };

      if (image) {
        const base64Image = imagePreview.split(',')[1];
        requestBody.messages = [{
          role: "user",
          content: input || "What is in this image?",
          images: [base64Image]
        }];
      } else {
        requestBody.messages = [
          ...chats[currentChat].messages,
          { role: "user", content: input }
        ];
      }

      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      setChats(prev => ({
        ...prev,
        [currentChat]: {
          ...prev[currentChat],
          messages: [...prev[currentChat].messages, {
            role: "assistant",
            content: data.message?.content || "Sorry, no response."
          }]
        }
      }));
    } catch (error) {
      console.error("Error:", error);
      setChats(prev => ({
        ...prev,
        [currentChat]: {
          ...prev[currentChat],
          messages: [...prev[currentChat].messages, {
            role: "assistant",
            content: "Sorry, something went wrong."
          }]
        }
      }));
    }
    
    removeImage();
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    const updatedChats = { ...chats };
    delete updatedChats[chatId];
    setChats(updatedChats);
    if (currentChat === chatId) {
      setCurrentChat(Object.keys(updatedChats)[0] || null);
    }
  };

  const startEditing = (chatId, name, e) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditName(name);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editName.trim()) {
      setChats(prev => ({
        ...prev,
        [editingChatId]: { ...prev[editingChatId], name: editName.trim() }
      }));
    }
    setEditingChatId(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-1/4 bg-gray-800 flex flex-col p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Synapse Desk</h1>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            onClick={createNewChat}
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto">
          {Object.entries(chats).map(([chatId, chat]) => (
            <li
              key={chatId}
              onClick={() => setCurrentChat(chatId)}
              className={`group flex items-center justify-between hover:bg-gray-700 px-4 py-2 rounded cursor-pointer ${
                currentChat === chatId ? "bg-gray-700" : ""
              }`}
            >
              {editingChatId === chatId ? (
                <form onSubmit={handleEditSubmit} className="flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-600 px-2 py-1 rounded"
                    autoFocus
                    onBlur={handleEditSubmit}
                  />
                </form>
              ) : (
                <span
                  onDoubleClick={(e) => startEditing(chatId, chat.name, e)}
                  className="flex-1"
                >
                  {chat.name}
                </span>
              )}
              <button
                onClick={(e) => deleteChat(chatId, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">{currentChat && chats[currentChat]?.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTempControl(!showTempControl)}
              className="flex items-center gap-1 text-gray-400 hover:text-white"
            >
              <Thermometer size={16} />
              {chats[currentChat]?.temperature.toFixed(1)}
            </button>
            {showTempControl && (
              <div className="absolute right-4 top-12 bg-gray-700 p-4 rounded shadow-lg">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={chats[currentChat]?.temperature}
                  onChange={(e) => updateTemperature(parseFloat(e.target.value))}
                  className="w-32"
                />
              </div>
            )}

            <div className="relative">
              <select
                onChange={(e) => {
                  const newModel = e.target.value;
                  setChats(prev => ({
                    ...prev,
                    [currentChat]: { ...prev[currentChat], model: newModel }
                  }));
                }}
                className="bg-gray-800 text-white mt-1 w-40 rounded-md"
                value={chats[currentChat]?.model}
              >
                {models.map((model, index) => (
                  <option key={index} value={model.name || model.model}>
                    {model.name || model.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat && chats[currentChat]?.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-md ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="Uploaded content"
                    className="max-w-xs mb-2 rounded"
                  />
                )}
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {currentChat && (
          <footer className="bg-gray-800 p-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded"
                placeholder="Type a message..."
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="bg-gray-700 text-white p-2 rounded cursor-pointer hover:bg-gray-600"
              >
                <ImageIcon size={20} />
              </label>
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
              >
                <Send size={16} />
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

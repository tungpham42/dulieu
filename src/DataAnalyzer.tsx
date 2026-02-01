import React, { useState } from "react";
import {
  Layout,
  Upload,
  Button,
  Card,
  Typography,
  message,
  Space,
  Input,
  Tabs,
  Alert,
  ConfigProvider,
  FloatButton,
} from "antd";
import {
  InboxOutlined,
  RocketOutlined,
  DeleteOutlined,
  FileTextTwoTone,
  FileExcelTwoTone,
  SafetyCertificateTwoTone,
  ArrowUpOutlined,
  FileMarkdownTwoTone, // Icon chuyên dụng cho Markdown
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import axios from "axios";
import * as XLSX from "xlsx";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

// Cấu hình Prompt mặc định
const DEFAULT_PROMPT = `
Bạn là một chuyên gia phân tích dữ liệu (Data Analyst) thân thiện và chuyên nghiệp. 
Nhiệm vụ:
1. Đọc dữ liệu đầu vào bên dưới (có thể là Excel, CSV, JSON hoặc file MARKDOWN/Văn bản).
2. Nếu là số liệu: Phân tích xu hướng, thống kê.
3. Nếu là văn bản/markdown: Tóm tắt nội dung, rút ra các ý chính và cấu trúc lại thông tin.
4. Trình bày kết quả dưới dạng báo cáo đẹp mắt, dễ đọc (dùng bảng, list).
`;

interface ApiResponse {
  result: string;
}

const DataAnalyzer: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("1");
  const [markdownOutput, setMarkdownOutput] = useState<string>("");
  const [rawInputData, setRawInputData] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<
    "excel" | "json" | "markdown" | "text"
  >("text");

  // --- LOGIC XỬ LÝ FILE ---
  const handleFileUpload = (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setMarkdownOutput("");

    const reader = new FileReader();

    // Kiểm tra loại file
    const isJson =
      file.type === "application/json" || file.name.endsWith(".json");
    const isMarkdown =
      file.name.endsWith(".md") ||
      file.name.endsWith(".markdown") ||
      file.type === "text/markdown";

    // Xử lý Text-based files (JSON, Markdown, TXT)
    if (isJson || isMarkdown) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;

          if (isJson) {
            JSON.parse(text); // Validate JSON
            setFileType("json");
            message.success({
              content: `Đã đọc JSON: ${file.name}`,
              icon: <FileTextTwoTone twoToneColor="#52c41a" />,
            });
          } else {
            setFileType("markdown");
            message.success({
              content: `Đã đọc Markdown: ${file.name}`,
              icon: <FileMarkdownTwoTone twoToneColor="#52c41a" />,
            });
          }

          setRawInputData(text);
        } catch (error) {
          message.error("File lỗi hoặc sai định dạng.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
    // Xử lý Excel / CSV (Binary)
    else {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(sheet);

          setFileType("excel");
          setRawInputData(csvData);
          message.success({
            content: `Đã đọc Excel: ${file.name}`,
            icon: <FileExcelTwoTone twoToneColor="#52c41a" />,
          });
        } catch (error) {
          message.error("Lỗi đọc file Excel/CSV.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    }
    return false;
  };

  const handleAnalyze = async () => {
    if (!rawInputData.trim()) {
      message.warning("Vui lòng nhập dữ liệu trước!");
      return;
    }

    setLoading(true);
    try {
      const prompt = `${DEFAULT_PROMPT}\n\nDATA_INPUT (${fileType}):\n\`\`\`\n${rawInputData}\n\`\`\``;
      const response = await axios.post<ApiResponse>(
        "https://groqprompt.netlify.app/api/ai",
        { prompt: prompt },
      );

      if (response.data && response.data.result) {
        setMarkdownOutput(response.data.result);
        message.success("Phân tích hoàn tất!");
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      } else {
        message.warning("API không phản hồi kết quả.");
      }
    } catch (error) {
      console.error(error);
      message.error("Có lỗi kết nối đến máy chủ AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRawInputData("");
    setFileName("");
    setMarkdownOutput("");
    setFileType("text");
  };

  // --- CẤU HÌNH UI ---
  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    // Thêm .md, .markdown vào accept
    accept:
      ".csv, .json, .md, .markdown, application/json, text/markdown, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
    beforeUpload: handleFileUpload,
    showUploadList: false,
  };

  const items = [
    {
      key: "1",
      label: (
        <span>
          <FileMarkdownTwoTone twoToneColor="#ff7e5f" /> Nhập Text / JSON /
          Markdown
        </span>
      ),
      children: (
        <TextArea
          rows={8}
          placeholder="Dán nội dung CSV, JSON, Markdown hoặc văn bản cần phân tích vào đây..."
          value={activeTab === "1" ? rawInputData : ""}
          onChange={(e) => {
            setRawInputData(e.target.value);
            setFileName("");
            setFileType("text");
          }}
          style={{
            fontFamily: "monospace",
            fontSize: "14px",
            border: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        />
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <FileExcelTwoTone twoToneColor="#ff7e5f" /> Tải File
        </span>
      ),
      children: (
        <div style={{ padding: "20px 0" }}>
          <Dragger
            {...uploadProps}
            style={{ border: "2px dashed #ffdec8", background: "#fff9f5" }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#ff7e5f" }} />
            </p>
            <p className="ant-upload-text">Kéo thả file vào đây</p>
            <p className="ant-upload-hint">
              Hỗ trợ:{" "}
              <span style={{ fontWeight: 600 }}>.xlsx, .csv, .json, .md</span>
            </p>
          </Dragger>
        </div>
      ),
    },
  ];

  // Helper để render icon dựa trên fileType
  const getFileIcon = () => {
    switch (fileType) {
      case "excel":
        return (
          <FileExcelTwoTone twoToneColor="#52c41a" style={{ marginRight: 8 }} />
        );
      case "json":
        return (
          <FileTextTwoTone twoToneColor="#52c41a" style={{ marginRight: 8 }} />
        );
      case "markdown":
        return (
          <FileMarkdownTwoTone
            twoToneColor="#52c41a"
            style={{ marginRight: 8 }}
          />
        );
      default:
        return (
          <SafetyCertificateTwoTone
            twoToneColor="#52c41a"
            style={{ marginRight: 8 }}
          />
        );
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Work Sans', sans-serif",
          colorPrimary: "#ff7e5f",
        },
      }}
    >
      <Layout className="site-layout" style={{ minHeight: "100vh" }}>
        {/* Header */}
        <Header
          className="site-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SafetyCertificateTwoTone
              twoToneColor="#ff7e5f"
              style={{ fontSize: "28px" }}
            />
            <Title
              level={4}
              style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.5px" }}
            >
              Data<span style={{ color: "#ff7e5f" }}>Insight</span>
            </Title>
          </div>
        </Header>

        <Content
          style={{
            padding: "40px 20px",
            maxWidth: "900px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Hero Section */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <Title
                level={1}
                className="hero-title"
                style={{ marginBottom: 10 }}
              >
                Biến dữ liệu thành thông tin.
              </Title>
              <Paragraph
                style={{
                  fontSize: "16px",
                  color: "#636e72",
                  maxWidth: "600px",
                  margin: "0 auto",
                }}
              >
                Tải lên file <b>Excel</b>, <b>CSV</b>, <b>JSON</b> hoặc{" "}
                <b>Markdown</b>. AI sẽ tự động phân tích và tạo báo cáo chi tiết
                cho bạn trong vài giây.
              </Paragraph>
            </div>

            {/* Input Card */}
            <Card bordered={false} className="cozy-card">
              <Tabs
                defaultActiveKey="1"
                items={items}
                onChange={setActiveTab}
                centered
                style={{ marginBottom: 20 }}
              />

              {/* Status Bar */}
              <div style={{ marginBottom: 24 }}>
                {rawInputData ? (
                  <Alert
                    message={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          {getFileIcon()}
                          <b>Dữ liệu sẵn sàng: </b>
                          {fileName ? fileName : `${rawInputData.length} ký tự`}
                        </span>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={handleClear}
                          size="small"
                        >
                          Xóa
                        </Button>
                      </div>
                    }
                    type="success"
                    showIcon={false}
                    style={{ border: "none" }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      background: "#fafafa",
                      borderRadius: "12px",
                      color: "#999",
                    }}
                  >
                    👋 Vui lòng nhập dữ liệu để bắt đầu phân tích
                  </div>
                )}
              </div>

              <Button
                type="primary"
                icon={!loading && <RocketOutlined />}
                size="large"
                onClick={handleAnalyze}
                loading={loading}
                block
                disabled={!rawInputData}
                style={{ height: "56px", fontSize: "18px" }}
              >
                {loading ? "AI đang suy nghĩ..." : "Phân tích ngay"}
              </Button>
            </Card>

            {/* Output Card */}
            {markdownOutput && (
              <Card
                title={
                  <Title level={3} style={{ margin: 0 }}>
                    📊 Báo cáo phân tích
                  </Title>
                }
                bordered={false}
                className="cozy-card"
                style={{ animation: "fadeIn 0.5s ease-in-out" }}
              >
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {markdownOutput}
                  </ReactMarkdown>
                </div>
              </Card>
            )}
          </Space>
        </Content>

        <Footer
          style={{
            textAlign: "center",
            background: "transparent",
            color: "#aaa",
          }}
        >
          DataInsight AI © {new Date().getFullYear()} • Made with ❤️ & Coffee
        </Footer>

        <FloatButton.BackTop
          type="primary"
          icon={<ArrowUpOutlined />}
          style={{ right: 40, bottom: 40 }}
          visibilityHeight={300}
          tooltip="Lên đầu trang"
        />
      </Layout>
    </ConfigProvider>
  );
};

export default DataAnalyzer;

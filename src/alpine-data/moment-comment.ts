export default () => ({
  current: "",
  commentCounts: {} as Record<string, number>,
  initialized: false,

  isOpen(id: string) {
    return id === this.current;
  },

  setCurrent(id: string) {
    if (id === this.current) {
      this.current = "";
      return;
    }
    this.current = id;
  },

  async init() {
    // 防止重复初始化
    if (this.initialized) {
      console.log("Twikoo comment count already initialized, skipping...");
      return;
    }

    // 检查是否启用了 Twikoo 评论数量显示
    const twikooConfig = (window as any).twikooConfig;
    console.log("Twikoo config:", twikooConfig);

    if (!twikooConfig?.enabled) {
      console.log("Twikoo comment count not enabled");
      return;
    }

    // 检查 envId 是否配置
    if (!twikooConfig.envId) {
      console.warn("Twikoo envId not configured");
      return;
    }

    console.log("Starting Twikoo comment count initialization with envId:", twikooConfig.envId);

    // 标记为已初始化
    this.initialized = true;

    // 等待 Twikoo 初始化完成
    await this.waitForTwikoo();

    try {
      // 获取所有瞬间的 URL 路径
      const momentElements = document.querySelectorAll(".moment-item");
      const urls: string[] = [];

      momentElements.forEach((element) => {
        const momentId = element.id;
        if (momentId) {
          // 构建瞬间的 URL 路径，格式为 /moments/{momentId}
          urls.push(`/moments/${momentId}`);
        }
      });

      if (urls.length === 0) {
        return;
      }

      // 使用配置的 envId 获取评论数量
      const result = await (window as any).twikoo.getCommentsCount({
        envId: twikooConfig.envId,
        urls: urls,
        includeReply: false,
      });

      // 处理返回结果，更新评论数量
      result.forEach((item: { url: string; count: number }) => {
        // 从 URL 中提取 momentId
        const momentId = item.url.replace("/moments/", "");
        this.commentCounts[momentId] = item.count;

        // 更新页面上的评论数量显示
        const commentCountElement = document.querySelector(`[data-moment-comment-count="${momentId}"]`);
        if (commentCountElement) {
          commentCountElement.textContent = item.count.toString();
        }
      });
    } catch (error) {
      console.error("Failed to load Twikoo comment counts:", error);
    }
  },

  // 等待 Twikoo 初始化完成
  async waitForTwikoo(maxRetries = 10, delay = 500): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      // 检查 Twikoo 是否存在且已初始化
      if (
        typeof (window as any).twikoo !== "undefined" &&
        typeof (window as any).twikoo.getCommentsCount === "function"
      ) {
        // 检查 Twikoo 是否已经完全初始化
        // 通过检查 Twikoo 对象的属性来判断，而不是发起请求
        if ((window as any).twikoo.init || (window as any).twikoo.version) {
          console.log("Twikoo is ready");
          return; // 初始化成功
        }
      }

      console.log(`Waiting for Twikoo... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error("Twikoo plugin not found or failed to initialize after maximum retries");
  },

  getCommentCount(momentId: string): number {
    return this.commentCounts[momentId] || 0;
  },
});

#!/bin/bash

# 运行测试：终端运行 npm run test:api

# OnlySpecs API 快速测试脚本

API_BASE="http://localhost:3580"

echo "🧪 OnlySpecs API 测试"
echo "===================="
echo ""

# 1. 健康检查
echo "1️⃣  健康检查"
curl -s $API_BASE/health | python3 -m json.tool
echo ""

# 2. 列出所有任务
echo "2️⃣  当前任务列表"
curl -s $API_BASE/tasks | python3 -m json.tool
echo ""

# 3. 创建新任务（可选）
if [ "$1" == "create" ]; then
    echo "3️⃣  创建新任务"
    RESPONSE=$(curl -s -X POST $API_BASE/generate \
        -H "Content-Type: application/json" \
        -d '{"prompt":"创建一个简单的 HTML 页面，包含：\n- 标题 Hello World\n- 一个段落\n- 简单的 CSS 样式"}')

    echo $RESPONSE | python3 -m json.tool

    TASK_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['taskId'])")
    echo ""
    echo "✅ 任务已创建: $TASK_ID"
    echo ""

    # 查询状态
    echo "4️⃣  查询任务状态"
    curl -s $API_BASE/status/$TASK_ID | python3 -m json.tool
    echo ""

    echo "💡 查看日志: curl -s $API_BASE/logs/$TASK_ID"
    echo "💡 查询状态: curl -s $API_BASE/status/$TASK_ID"
fi

# 使用说明
if [ "$1" != "create" ]; then
    echo "💡 使用方法:"
    echo "   ./test-api.sh         # 查看健康状态和任务列表"
    echo "   ./test-api.sh create  # 创建新任务并查看状态"
fi

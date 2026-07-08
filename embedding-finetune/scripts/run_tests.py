#!/usr/bin/env python3
"""统一测试入口：发现并运行 tests/ 下全部 unittest，打印汇总。

运行（embedding-finetune/ 目录下）：
    python3 scripts/run_tests.py
成功判据：末尾打印 all embedding-finetune tests passed，退出码 0。
"""

import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
sys.path.insert(0, os.path.join(_ROOT, "src"))
sys.path.insert(0, _ROOT)


def main() -> int:
    loader = unittest.TestLoader()
    suite = loader.discover(os.path.join(_ROOT, "tests"), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.wasSuccessful():
        print("all embedding-finetune tests passed")
        return 0
    print("embedding-finetune tests FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())

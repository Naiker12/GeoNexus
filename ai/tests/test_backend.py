"""Unit tests for GeoNexus Python Backend modules."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.hub.vram_fit import calculate_vram_fit
from core.hub.discover import search_hf_models
from docs.chunker import chunk_text
from agent.prompt_builder import build_system_prompt
from core.security.remote_code_scan import scan_remote_code_security


class TestVramFit(unittest.TestCase):
    def test_calculate_vram_fit(self):
        hardware = {
            "has_gpu": True,
            "gpu_name": "Test GPU",
            "gpu_total_gb": 16.0,
            "gpu_free_gb": 14.0,
            "ram_total_gb": 32.0,
            "ram_free_gb": 24.0,
        }
        fit = calculate_vram_fit(model_size_gb=4.5, context_tokens=4096, hardware=hardware)
        self.assertTrue(fit["fits_vram"])
        self.assertEqual(fit["fit_level"], "full_vram")
        self.assertGreater(fit["required_vram_gb"], 4.5)

    def test_calculate_vram_fit_ram_only(self):
        hardware = {
            "has_gpu": True,
            "gpu_name": "Small GPU",
            "gpu_total_gb": 4.0,
            "gpu_free_gb": 2.0,
            "ram_total_gb": 32.0,
            "ram_free_gb": 24.0,
        }
        fit = calculate_vram_fit(model_size_gb=10.0, context_tokens=4096, hardware=hardware)
        self.assertFalse(fit["fits_vram"])
        self.assertTrue(fit["fits_ram"])
        self.assertEqual(fit["fit_level"], "ram_only")


class TestHubDiscover(unittest.TestCase):
    def test_search_offline_fallback(self):
        res = search_hf_models(query="qwen", task="text-generation")
        self.assertIn("models", res)
        self.assertGreaterEqual(res["total"], 0)


class TestDocsChunker(unittest.TestCase):
    def test_chunk_text(self):
        sample_text = "Parrafo 1 de prueba.\n\nParrafo 2 con mas contenido para indexacion.\n\nParrafo 3 final."
        chunks = chunk_text(sample_text, chunk_size=100, overlap=10)
        self.assertIsInstance(chunks, list)
        self.assertGreater(len(chunks), 0)


class TestPromptBuilder(unittest.TestCase):
    def test_build_system_prompt(self):
        prompt = build_system_prompt(
            project_context="Proyecto de Minería",
            skill_contents=["Skill 1: Analizar curvas de nivel"],
        )
        self.assertIn("GeoAgents", prompt)
        self.assertIn("Proyecto de Minería", prompt)
        self.assertIn("Skill 1", prompt)


class TestSecurityScan(unittest.TestCase):
    def test_clean_model_scan(self):
        scan = scan_remote_code_security("model-clean-id")
        self.assertTrue(scan["approvable"])
        self.assertEqual(scan["risk_level"], "low")


if __name__ == "__main__":
    unittest.main()

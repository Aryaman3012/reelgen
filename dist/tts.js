"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTTS = generateTTS;
const axios_1 = __importDefault(require("axios"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function generateTTS(text, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.AZURE_API_KEY;
        const url = "https://dunlin-deployment.openai.azure.com/openai/deployments/tts-hd/audio/speech?api-version=2025-03-01-preview";
        const data = {
            model: "tts-hd",
            input: text,
            voice: "alloy"
        };
        const response = yield axios_1.default.post(url, data, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            responseType: "arraybuffer"
        });
        yield fs_extra_1.default.writeFile(outputPath, response.data);
    });
}

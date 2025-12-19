/// <reference types="node" />
import { Router, Request, Response } from 'express';
import { printToPrinter } from '../utils/printer';
import { logger } from '../utils/logger';
import { validatePrintJobRequest } from '../utils/validation';
import { DEFAULT_CONFIG } from '../constants';
import type { PcAgentResponse } from '../types/common';
import { stateService } from '../services/state.service';

export const printRouter = Router();

/**
 * POST /print
 * Receives print jobs from the cloud/web app
 * Expects base64-encoded ESC/POS commands
 */
printRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request using shared validation utility
    const validation = validatePrintJobRequest(req.body);
    if (!validation.valid || !validation.request) {
      const errorResponse: PcAgentResponse = {
        status: 'ERROR',
        message: validation.error || 'Invalid request',
      };
      return res.status(400).json(errorResponse);
    }

    const { text, format, printerIp, printerPort } = validation.request;

    // Get printer configuration
    // Use provided values or fall back to environment defaults
    const targetPrinterIp: string = printerIp || process.env.PRINTER_IP || DEFAULT_CONFIG.PRINTER_IP;
    const targetPrinterPort: number = printerPort || parseInt(process.env.PRINTER_PORT || String(DEFAULT_CONFIG.PRINTER_PORT), 10);

    // Decode base64 data if format is base64
    let printData: Buffer;
    if (format === 'base64') {
      try {
        printData = Buffer.from(text, 'base64');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Invalid base64 data';
        logger.error('Failed to decode base64 data', { error: errorMsg });
        const errorResponse: PcAgentResponse = {
          status: 'ERROR',
          message: `Invalid base64 data: ${errorMsg}`,
        };
        return res.status(400).json(errorResponse);
      }
    } else {
      // Format is 'text' (validated by validation utility)
      printData = Buffer.from(text, 'utf-8');
    }

    // Validate print data
    if (printData.length === 0) {
      const errorResponse: PcAgentResponse = {
        status: 'ERROR',
        message: 'Print data is empty',
      };
      return res.status(400).json(errorResponse);
    }

    logger.info('Received print job', {
      printerIp: targetPrinterIp,
      printerPort: targetPrinterPort,
      dataLength: printData.length,
      format: format,
    });

    // Send to printer
    await printToPrinter(targetPrinterIp, targetPrinterPort, printData);

    // Record successful print job
    stateService.recordPrintJob(true);

    // Return success response in standard format
    const successResponse: PcAgentResponse = {
      status: 'DONE',
      message: 'Print job sent successfully',
      printerIp: targetPrinterIp,
      printerPort: targetPrinterPort,
    };
    res.json(successResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Print job failed', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Record failed print job and error
    stateService.recordPrintJob(false);
    if (error instanceof Error) {
      stateService.recordError(error);
    }

    const errorResponse: PcAgentResponse = {
      status: 'ERROR',
      message: `Failed to print: ${errorMessage}`,
    };
    res.status(500).json(errorResponse);
  }
});


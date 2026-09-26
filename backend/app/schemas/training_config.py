"""
Training Configuration and Model Metadata Schemas
Defines expected schemas for:
- backend/models/training_config.json
- backend/models/normalization.json
- backend/models/metrics.json
"""
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field

class NormalizationConfig(BaseModel):
    """Schema expected by backend/models/normalization.json"""
    method: str = Field(..., description="Normalization method: 'minmax', 'zscore', or 'kelvin_scale'")
    input_min: Optional[float] = Field(None, description="Minimum brightness temperature or value")
    input_max: Optional[float] = Field(None, description="Maximum brightness temperature or value")
    mean: Optional[float] = Field(None, description="Mean for z-score normalization")
    std: Optional[float] = Field(None, description="Std dev for z-score normalization")
    target_range: Tuple[float, float] = Field((0.0, 1.0), description="Normalized target range")

class TrainingConfigSchema(BaseModel):
    """Schema expected by backend/models/training_config.json"""
    model_architecture: str = Field("ConvGRUResidualNetwork", description="Architecture name")
    input_sequence_length: int = Field(2, description="Number of past input frames, e.g., T-1, T")
    output_sequence_length: int = Field(1, description="Number of forecast step residual frames")
    spatial_dimensions: Tuple[int, int] = Field((128, 128), description="Grid resolution (H, W)")
    in_channels: int = Field(5, description="Input channels: [prev, curr, u, v, env]")
    hidden_channels: int = Field(16, description="Hidden ConvGRU channels")
    kernel_size: int = Field(3, description="Convolutional kernel size")
    normalization_method: str = Field("minmax", description="Normalization method")
    epochs: int = Field(..., description="Total training epochs in Colab")
    learning_rate: float = Field(..., description="Learning rate used")
    optimizer: str = Field("Adam", description="Optimizer algorithm")
    loss: str = Field("MSE + BoundedResidualLoss", description="Objective loss function")
    dataset_info: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dataset and historical storm event provenance"
    )

class ModelMetrics(BaseModel):
    """Schema expected by backend/models/metrics.json"""
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    mse: Optional[float] = None
    mae: Optional[float] = None
    csi_score: Optional[float] = None
    hss_score: Optional[float] = None
    evaluated_at: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

class ModelInfoResponse(BaseModel):
    """Schema returned by GET /model-info"""
    model: str = "ConvGRU Residual Nowcaster"
    version: str = "convnowcast-v0.1"
    status: str = Field(..., description="'trained' or 'not_trained'")
    checkpoint: Optional[str] = None
    training_dataset: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    trained_at: Optional[str] = None
    inference_device: str = "cpu"
    message: Optional[str] = None
    normalization: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None

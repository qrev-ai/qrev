from pydantic import BaseModel, Field, model_validator
from pathlib import Path
from typing import Optional, Annotated

class MyModel(BaseModel):
    parent: Optional['MyModel'] = Field(default=None)
    mypath: Annotated[Path, Field(...)]
    
    @model_validator(mode='before')
    def make_mypath_absolute(cls, values):
        if values.get('parent') is not None:
            parent_path = values['parent'].mypath
            values['mypath'] = parent_path / values['mypath']
        return values

    @model_validator(mode='after')
    def make_mypath_relative(cls, values):
        if values.parent is not None:
            values.mypath = values.mypath.relative_to(values.parent.mypath)
        return values
    
    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        if self.parent is not None:
            data['mypath'] = str(self.mypath.relative_to(self.parent.mypath))
        else:
            data['mypath'] = str(self.mypath)
        return data

    class Config:
        arbitrary_types_allowed = True

MyModel.model_rebuild()

# Example usage
root_model = MyModel(mypath=Path('/root/path'))
child_model = MyModel(parent=root_model, mypath=Path('/root/path/child'))
print(child_model.model_dump_json())

# Deserialize and resolve path
root = Path('/new/root/path')
loaded_model = MyModel.model_validate_json(child_model.model_dump_json())
resolved_path = root / loaded_model.mypath
print(resolved_path)
